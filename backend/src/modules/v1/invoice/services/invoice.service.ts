import { db } from '../../../../models/db.js';

export const invoiceService = {
  getInvoices: async (username: string) => {
    const invoices = await db
      .selectFrom('invoice')
      .selectAll()
      .where('username', '=', username)
      .orderBy('id', 'desc')
      .execute();
      
    const baseURL = process.env.APP_URL || 'http://127.0.0.1:3040';
    return invoices.map(inv => ({
      ...inv,
      pdf_link: `${baseURL}/api/v1/invoices/${inv.id}/pdf`
    }));
  },

  getInvoiceById: async (id: number) => {
    return await db
      .selectFrom('invoice')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  },

  getCompanyById: async (id: number) => {
    return await db
      .selectFrom('invoice_companies')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  },

  getCompanyByGstin: async (gstin: string) => {
    return await db
      .selectFrom('invoice_companies')
      .selectAll()
      .where('gstin', '=', gstin)
      .executeTakeFirst();
  },

  createInvoice: async (data: any) => {
    const result = await db
      .insertInto('invoice')
      .values(data)
      .executeTakeFirst();
    return result;
  },

  updateInvoice: async (id: number, data: any) => {
    return await db
      .updateTable('invoice')
      .set(data)
      .where('id', '=', id)
      .execute();
  },

  getCompanies: async (username: string) => {
    return await db
      .selectFrom('invoice_companies')
      .selectAll()
      .where('username', '=', username)
      .orderBy('id', 'desc')
      .execute();
  },

  createCompany: async (data: any) => {
    const result = await db
      .insertInto('invoice_companies')
      .values(data)
      .executeTakeFirst();
    return result;
  },

  updateCompany: async (id: number, data: any) => {
    return await db
      .updateTable('invoice_companies')
      .set(data)
      .where('id', '=', id)
      .execute();
  },

  deleteCompany: async (id: number) => {
    return await db
      .deleteFrom('invoice_companies')
      .where('id', '=', id)
      .execute();
  }
};
