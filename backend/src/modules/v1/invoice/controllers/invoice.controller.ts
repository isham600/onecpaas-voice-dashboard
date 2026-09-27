import type { FastifyRequest } from 'fastify';
import { invoiceService } from '../services/invoice.service.js';

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convert = (n: number): string => {
    if (n >= 10000000) return convert(Math.floor(n / 10000000)) + "Crore " + convert(n % 10000000);
    if (n >= 100000) return convert(Math.floor(n / 100000)) + "Lakh " + convert(n % 100000);
    if (n >= 1000) return convert(Math.floor(n / 1000)) + "Thousand " + convert(n % 1000);
    if (n >= 100) return convert(Math.floor(n / 100)) + "Hundred " + convert(n % 100);
    if (n > 0) {
      if (n < 20) return a[n];
      return b[Math.floor(n / 10)] + (n % 10 > 0 ? " " + a[n % 10] : " ");
    }
    return "";
  };

  const str = num.toFixed(2).split('.');
  const whole = parseInt(str[0], 10);
  const fraction = parseInt(str[1], 10);
  
  let res = whole > 0 ? convert(whole) : "";
  if (fraction > 0) {
      res += (res ? "and " : "") + convert(fraction) + "Paise ";
  }
  return res.trim();
}

export const invoiceController = {
  read: async (request: FastifyRequest) => {
    const { username } = request.body as { username?: string } || {};
    const user = username || (request.user as any)?.username;
    
    if (!user) {
      throw new Error('Username is required');
    }

    const invoices = await invoiceService.getInvoices(user);
    
    return {
      success: true,
      message: 'Invoices fetched successfully',
      data: invoices
    };
  },

  create: async (request: FastifyRequest) => {
    const data = request.body as any;
    if ((request.user as any)?.username) {
       data.username = data.username || (request.user as any)?.username;
    }

    if (!data.user_id && (request.user as any)?.id) {
        data.user_id = String((request.user as any)?.id);
    }

    if (!data.invoice_no) data.invoice_no = `INV-${Date.now()}`;

    if (data.company_id) {
      const company = await invoiceService.getCompanyById(Number(data.company_id));
      if (company) {
        data.company_name = company.company_name;
        data.company_address = company.company_address;
        data.company_email = company.company_email;
        data.company_mobile = company.phone_number;
      }
    }

    if (data.user_id) {
      const customer = await invoiceService.getCompanyById(Number(data.user_id));
      if (customer) {
        data.payer_company_name = customer.company_name;
        data.payer_address = customer.company_address;
        data.payer_email = customer.company_email;
        data.payer_mobile = customer.phone_number;
      }
    }

    try {
      if (data.action === 'update' && data.invoice_id) {
         const invoiceId = Number(data.invoice_id);
         
         delete data.action;
         delete data.invoice_id;
         delete data.products;
         delete data.company_id;
         delete data.company_country;
         delete data.phone_number;
         delete data.logo;

         await invoiceService.updateInvoice(invoiceId, data);
         
         try {
           const pdfData = await invoiceController.generateAndSavePDF(invoiceId);
           if (pdfData) {
             await invoiceService.updateInvoice(invoiceId, { pdf_link: pdfData.pdf_link, pdf_path: pdfData.pdf_path });
           }
         } catch (pdfErr) {
           console.error('Error generating PDF on update:', pdfErr);
         }

         return {
           success: true,
           message: 'Invoice updated successfully',
           status: 1
         };
      } else {
         delete data.action;
         delete data.invoice_id;
         delete data.products;
         delete data.company_id;
         delete data.company_country;
         delete data.phone_number;
         delete data.logo;
         
         const result = await invoiceService.createInvoice(data) as any;
         const insertId = result.insertId !== undefined ? Number(result.insertId) : null;
         
         if (insertId) {
           try {
             const pdfData = await invoiceController.generateAndSavePDF(insertId);
             if (pdfData) {
               await invoiceService.updateInvoice(insertId, { pdf_link: pdfData.pdf_link, pdf_path: pdfData.pdf_path });
             }
           } catch (pdfErr) {
             console.error('Error generating PDF on create:', pdfErr);
           }
         }
         
         return {
           success: true,
           message: 'Invoice created successfully',
           status: 1
         };
      }
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      throw new Error(`Failed to save invoice: ${err.message}`);
    }
  },

  generateAndSavePDF: async (invoiceId: number) => {
    const invoice = await invoiceService.getInvoiceById(invoiceId);
    if (!invoice) return null;

    let seller = {} as any;
    if (invoice.gstin) {
      const company = await invoiceService.getCompanyByGstin(invoice.gstin);
      if (company) {
        seller = {
          name: company.company_name,
          address: company.company_address,
          email: company.company_email,
          phone: company.phone_number,
          gstin: company.gstin,
          stateName: company.country,
          stateCode: '',
          contactPerson: company.company_name,
          logo: company.company_image || company.image_path
        };
      }
    }

    const buyer = {
      name: invoice.payer_name || 'Customer',
      address: invoice.payer_address || '',
      email: invoice.payer_email || '',
      phone: invoice.payer_mobile || '',
      gstin: '', 
      stateName: '',
      stateCode: '',
      placeOfSupply: ''
    };

    const consignee = { ...buyer }; 

    let items = [];
    let extraData: any = {};
    try {
      if (invoice.items_detail) {
        const parsed = JSON.parse(invoice.items_detail);
        let rawItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
        extraData = Array.isArray(parsed) ? {} : (parsed.extraData || {});
        items = rawItems.map((item: any) => ({
          description: item.products,
          hsnSac: item.hsnSac || '',
          quantity: item.quantity,
          rate: item.price,
          per: '',
          discPercent: 0,
          amount: item.quantity * item.price,
          gstRate: item.tax ? `${item.tax}%` : ''
        }));
      }
    } catch (e) {}

    const ejs = (await import('ejs')).default;
    const puppeteer = (await import('puppeteer')).default;
    const fs = await import('fs');
    const path = await import('path');

    const templatePath = path.resolve(process.cwd(), 'inovice-template/invoice_template.ejs');
    if (!fs.existsSync(templatePath)) {
       throw new Error('Template not found');
    }

    const html = await ejs.renderFile(templatePath, {
      invoice: {
        invoiceNo: invoice.invoice_no,
        invoiceDate: invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString() : '',
        copyType: 'Original for Recipient',
        deliveryNote: invoice.delivery_note || '',
        paymentTerms: invoice.payment_terms || '',
        referenceNo: '',
        otherReferences: '',
        buyersOrderNo: '',
        buyersOrderDate: '',
        dispatchDocNo: '',
        deliveryNoteDate: '',
        dispatchedThrough: '',
        destination: '',
        termsOfDelivery: invoice.termsncondition || '',
        grandTotal: Number(invoice.sub_total || 0) + Number(invoice.total_tax || 0) - Number(invoice.total_discount || 0),
        amountInWords: numberToWords(Number(invoice.sub_total || 0) + Number(invoice.total_tax || 0) - Number(invoice.total_discount || 0)) + ' Only',
        totalTaxableValue: Number(invoice.sub_total || 0),
        totalDiscount: Number(invoice.total_discount || 0),
        totalCgstAmount: 0,
        totalSgstAmount: 0,
        totalTaxAmount: Number(invoice.total_tax || 0),
        taxAmountInWords: numberToWords(Number(invoice.total_tax || 0)) + ' Only',
        declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
        clientNote: invoice.client_note || '',
        authorisedSignatory: extraData.authorisedSignatory || ''
      },
      seller,
      buyer,
      consignee,
      items,
      taxes: [],
      taxSummary: [],
      bank: {
        name: '',
        accountNo: '',
        branch: '',
        ifsc: ''
      },
      totals: {
        totalAmountBeforeTax: Number(invoice.sub_total || 0),
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxAmountTotal: Number(invoice.total_tax || 0),
        totalAmountAfterTax: Number(invoice.sub_total || 0) + Number(invoice.total_tax || 0) - Number(invoice.total_discount || 0)
      }
    });

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' as any });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const dir = path.join(process.cwd(), 'uploads', 'invoices');
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `invoice-${invoice.invoice_no}-${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    const baseURL = process.env.BASE_URL ?? 'http://localhost:3040';
    const pdf_link = `${baseURL}/uploads/invoices/${fileName}`;

    return { pdf_link, pdf_path: filePath };
  },

  generatePDF: async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
    try {
      const invoiceId = Number(request.params.id);
      const invoice = await invoiceService.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return reply.code(404).send({ success: false, message: 'Invoice not found' });
      }

      // We use gstin to fetch the seller's company details
      let seller = {} as any;
      if (invoice.gstin) {
        const company = await invoiceService.getCompanyByGstin(invoice.gstin);
        if (company) {
          seller = {
            name: company.company_name,
            address: company.company_address,
            email: company.company_email,
            phone: company.phone_number,
            gstin: company.gstin,
            stateName: company.country, // Just mapping generic fields
            stateCode: '', // Not available in schema
            contactPerson: company.company_name,
            logo: company.company_image || company.image_path
          };
        }
      }

      // Fetch buyer's details
      const buyer = {
        name: invoice.payer_name || 'Customer',
        address: invoice.payer_address || '',
        email: invoice.payer_email || '',
        phone: invoice.payer_mobile || '',
        gstin: '', 
        stateName: '',
        stateCode: '',
        placeOfSupply: ''
      };

      const consignee = { ...buyer }; // For simplicity, consignee is the buyer

      let items = [];
      let extraData: any = {};
      try {
        if (invoice.items_detail) {
          const parsed = JSON.parse(invoice.items_detail);
          let rawItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
          extraData = Array.isArray(parsed) ? {} : (parsed.extraData || {});
          items = rawItems.map((item: any) => ({
            description: item.products,
            hsnSac: item.hsnSac || '',
            quantity: item.quantity,
            rate: item.price,
            per: '',
            discPercent: 0,
            amount: item.quantity * item.price,
            gstRate: item.tax ? `${item.tax}%` : ''
          }));
        }
      } catch (e) {}

      const ejs = (await import('ejs')).default;
      const puppeteer = (await import('puppeteer')).default;
      const fs = await import('fs');
      const path = await import('path');

      const templatePath = path.resolve(process.cwd(), 'inovice-template/invoice_template.ejs');
      if (!fs.existsSync(templatePath)) {
         return reply.code(500).send({ success: false, message: 'Template not found' });
      }

      const html = await ejs.renderFile(templatePath, {
        invoice: {
          invoiceNo: invoice.invoice_no,
          invoiceDate: invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString() : '',
          copyType: 'Original for Recipient',
          deliveryNote: invoice.delivery_note || '',
          paymentTerms: invoice.payment_terms || '',
          referenceNo: '',
          otherReferences: '',
          buyersOrderNo: '',
          buyersOrderDate: '',
          dispatchDocNo: '',
          deliveryNoteDate: '',
          dispatchedThrough: '',
          destination: '',
          termsOfDelivery: invoice.termsncondition || '',
          grandTotal: Number(invoice.sub_total || 0) + Number(invoice.total_tax || 0) - Number(invoice.total_discount || 0),
          amountInWords: numberToWords(Number(invoice.sub_total || 0) + Number(invoice.total_tax || 0) - Number(invoice.total_discount || 0)) + ' Only',
          totalTaxableValue: Number(invoice.sub_total || 0),
          totalDiscount: Number(invoice.total_discount || 0),
          totalCgstAmount: 0,
          totalSgstAmount: 0,
          totalTaxAmount: Number(invoice.total_tax || 0),
          taxAmountInWords: numberToWords(Number(invoice.total_tax || 0)) + ' Only',
          declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
          clientNote: invoice.client_note || '',
          authorisedSignatory: extraData.authorisedSignatory || ''
        },
        seller,
        buyer,
        consignee,
        items,
        taxes: [],
        taxSummary: [],
        bank: {
          name: '',
          accountNo: '',
          branch: '',
          ifsc: ''
        },
        totals: {
          totalAmountBeforeTax: Number(invoice.sub_total || 0),
          cgstTotal: 0,
          sgstTotal: 0,
          igstTotal: 0,
          taxAmountTotal: Number(invoice.total_tax || 0),
          totalAmountAfterTax: Number(invoice.sub_total || 0) + Number(invoice.total_tax || 0) - Number(invoice.total_discount || 0)
        }
      });

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' as any });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_no}.pdf`);
      return reply.send(pdfBuffer);
    } catch (error: any) {
      console.error(error);
      return reply.code(500).send({ success: false, message: error.message });
    }
  },

  previewPDF: async (request: FastifyRequest, reply: any) => {
    try {
      const data: any = request.body;
      
      const { db } = await import('../../../../models/db.js');

      let company = null;
      if (data.gstin) {
        company = await invoiceService.getCompanyByGstin(data.gstin);
      }

      const seller = {
        name: data.company_name || company?.company_name || 'INDEW TECHNOLOGY',
        address: data.company_address || company?.company_address || 'B2 403',
        email: data.company_email || company?.company_email || 'contact@indew.co.in',
        phone: data.phone_number || company?.phone_number || '07314995599',
        gstin: data.gstin || company?.gstin || '23CHAPR5224C1ZU',
        stateName: data.company_country || company?.country || 'India',
        stateCode: '',
        contactPerson: data.company_name || company?.company_name || 'INDEW TECHNOLOGY',
        logo: data.logo || company?.company_image || null
      };

      let buyerRecord: any = null;
      if (data.user_id) {
        buyerRecord = await db.selectFrom('ci_admin').selectAll().where('admin_id', '=', data.user_id).executeTakeFirst();
      }
      
      const buyer = {
        name: data.payer_name || buyerRecord?.firstname || 'Customer',
        address: data.payer_address || buyerRecord?.address || '',
        email: data.payer_email || buyerRecord?.email || '',
        phone: data.payer_mobile || buyerRecord?.mobile_no || '',
        gstin: '', 
        stateName: buyerRecord?.country || '',
        stateCode: '',
        placeOfSupply: ''
      };

      const consignee = { ...buyer }; 

      let items = [];
      let extraData: any = {};
      try {
        if (data.items_detail) {
          const parsed = typeof data.items_detail === 'string' ? JSON.parse(data.items_detail) : data.items_detail;
          let rawItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
          extraData = Array.isArray(parsed) ? {} : (parsed.extraData || {});
          items = rawItems.map((item: any) => ({
            description: item.products,
            hsnSac: '',
            quantity: item.quantity,
            rate: item.price,
            per: '',
            discPercent: 0,
            amount: item.tax ? (item.quantity * item.price + item.tax) : (item.quantity * item.price)
          }));
        } else if (data.products) {
          items = data.products.map((item: any) => ({
            description: item.products,
            hsnSac: item.hsnSac || '',
            quantity: item.quantity,
            rate: item.price,
            per: '',
            discPercent: 0,
            amount: item.quantity * item.price,
            gstRate: item.tax ? `${item.tax}%` : ''
          }));
        }
      } catch (e) {}

      const ejs = (await import('ejs')).default;
      const puppeteer = (await import('puppeteer')).default;
      const fs = await import('fs');
      const path = await import('path');

      const templatePath = path.resolve(process.cwd(), 'inovice-template/invoice_template.ejs');
      if (!fs.existsSync(templatePath)) {
         return reply.code(500).send({ success: false, message: 'Template not found' });
      }

      const html = await ejs.renderFile(templatePath, {
        invoice: {
          invoiceNo: data.invoice_no || 'DRAFT',
          invoiceDate: data.payment_date || data.billing_date ? new Date(data.payment_date || data.billing_date).toLocaleDateString() : new Date().toLocaleDateString(),
          copyType: 'Original for Recipient',
          deliveryNote: data.delivery_note || '',
          paymentTerms: data.payment_terms || '',
          referenceNo: '',
          otherReferences: '',
          buyersOrderNo: '',
          buyersOrderDate: '',
          dispatchDocNo: '',
          deliveryNoteDate: '',
          dispatchedThrough: '',
          destination: '',
          termsOfDelivery: data.termsncondition || '',
          grandTotal: Number(data.sub_total || 0) + Number(data.total_tax || 0) - Number(data.total_discount || 0),
          amountInWords: numberToWords(Number(data.sub_total || 0) + Number(data.total_tax || 0) - Number(data.total_discount || 0)) + ' Only',
          totalTaxableValue: Number(data.sub_total || 0),
          totalDiscount: Number(data.total_discount || 0),
          totalCgstAmount: 0,
          totalSgstAmount: 0,
          totalTaxAmount: Number(data.total_tax || 0),
          taxAmountInWords: numberToWords(Number(data.total_tax || 0)) + ' Only',
          declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
          clientNote: data.client_note || '',
          authorisedSignatory: extraData.authorisedSignatory || ''
        },
        seller,
        buyer,
        consignee,
        items,
        taxes: [],
        taxSummary: [],
        bank: {
          name: '',
          accountNo: '',
          branch: '',
          ifsc: ''
        },
        totals: {
          totalAmountBeforeTax: Number(data.sub_total || 0),
          cgstTotal: 0,
          sgstTotal: 0,
          igstTotal: 0,
          taxAmountTotal: Number(data.total_tax || 0),
          totalAmountAfterTax: Number(data.sub_total || 0) + Number(data.total_tax || 0) - Number(data.total_discount || 0)
        }
      });

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' as any });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename=preview.pdf`);
      return reply.send(pdfBuffer);
    } catch (error: any) {
      console.error(error);
      return reply.code(500).send({ success: false, message: error.message });
    }
  },

  getCompanies: async (request: FastifyRequest) => {
    const { username } = request.body as { username?: string } || {};
    const user = username || (request.user as any)?.username;
    
    if (!user) throw new Error('Username is required');

    const companies = await invoiceService.getCompanies(user);
    
    return {
      success: true,
      message: 'Companies fetched successfully',
      data: companies
    };
  },

  createCompany: async (request: FastifyRequest) => {
    const data: any = {};
    let fileUrl: string | null = null;
    let filePath: string | null = null;

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const { pipeline } = await import('stream/promises');
          const { createWriteStream, mkdirSync } = await import('fs');
          const path = await import('path');
          const crypto = await import('crypto');

          const dir = path.join(process.cwd(), 'uploads', 'invoices');
          mkdirSync(dir, { recursive: true });

          const ext = path.extname(part.filename).toLowerCase() || '.png';
          const name = `${crypto.randomUUID()}${ext}`;
          const dest = path.join(dir, name);
          
          await pipeline(part.file, createWriteStream(dest));
          const base = process.env.BASE_URL ?? 'http://localhost:3040';
          fileUrl = `${base}/uploads/invoices/${name}`;
          filePath = dest;
        } else {
          data[part.fieldname] = part.value;
        }
      }
    } else {
      Object.assign(data, request.body);
    }

    if ((request.user as any)?.username) {
       data.username = data.username || (request.user as any)?.username;
    }

    if (fileUrl) {
      data.company_image = fileUrl;
      data.image_path = filePath;
    }

    delete data.action; // frontend sometimes sends action: "read" / "create"
    
    const result = await invoiceService.createCompany(data);
    
    return {
      success: true,
      status: 1,
      message: 'Company created successfully',
      company_id: result.insertId !== undefined ? Number(result.insertId) : null,
      company_image: fileUrl
    };
  },

  updateCompany: async (request: FastifyRequest) => {
    const data: any = {};
    let fileUrl: string | null = null;
    let filePath: string | null = null;

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const { pipeline } = await import('stream/promises');
          const { createWriteStream, mkdirSync } = await import('fs');
          const path = await import('path');
          const crypto = await import('crypto');

          const dir = path.join(process.cwd(), 'uploads', 'invoices');
          mkdirSync(dir, { recursive: true });

          const ext = path.extname(part.filename).toLowerCase() || '.png';
          const name = `${crypto.randomUUID()}${ext}`;
          const dest = path.join(dir, name);
          
          await pipeline(part.file, createWriteStream(dest));
          const base = process.env.BASE_URL ?? 'http://localhost:3040';
          fileUrl = `${base}/uploads/invoices/${name}`;
          filePath = dest;
        } else {
          data[part.fieldname] = part.value;
        }
      }
    } else {
      Object.assign(data, request.body);
    }

    if (!data.id) {
      throw new Error('Company ID is required');
    }
    const companyId = Number(data.id);
    delete data.id;

    if (fileUrl) {
      data.company_image = fileUrl;
      data.image_path = filePath;
    }

    delete data.action; 

    await invoiceService.updateCompany(companyId, data);
    
    return {
      success: true,
      status: 1,
      message: 'Company updated successfully',
      company_image: fileUrl
    };
  },

  deleteCompany: async (request: FastifyRequest) => {
    const data = request.body as { id: number };
    if (!data.id) throw new Error('Company ID is required');
    
    await invoiceService.deleteCompany(data.id);
    
    return {
      success: true,
      status: 1,
      message: 'Company deleted successfully'
    };
  }
};
