import { useState, useEffect } from "react";
import axios from "axios";
import { message } from "antd";
import Button from "../../components/Button/index";
import { getProfileMe } from "../../services/api";
import displayChannelName from "../../utils/channelNames";
const baseURL = import.meta.env.VITE_API_BASE_URL;
const ProductsAndServices = ({
  products,
  items,
  setItems,
  discount,
  setDiscount,
  EditInvoiceData,
}) => {
  const [subtotal, setSubtotal] = useState(0);
  const [totalCGST, setTotalCGST] = useState(0);
  const [totalSGST, setTotalSGST] = useState(0);
  const [totalIGST, setTotalIGST] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [mappedServices, setMappedServices] = useState([]);

  useEffect(() => {
    const fetchUserServices = async () => {
      try {
        const profileResponse = await getProfileMe();
        const profileData = profileResponse?.data?.data || {};
        const channelsData = profileData.channels || [];
        const permissionsData = profileData.permissions || {};

        const activeServices = Object.entries(permissionsData)
          .filter(([, val]) => val === 1)
          .map(([key]) => key);

        const channelsMap = channelsData.reduce((acc, channel) => {
          acc[channel.back_end_name] = displayChannelName(channel.front_end_name);
          return acc;
        }, {});

        const customValueMapping = {
          Whatsapp_marketing: "whatsapp_marketing_credits",
          whatsapp_utility: "whatsapp_utility_credits",
          bulk_whatsapp: "bulk_whatsapp_credits",
        };

        const mapped = activeServices.map((service) => ({
          value: customValueMapping[service] || service,
          label:
            channelsMap[
              service === "Whatsapp_marketing"
                ? "whatsapp_marketing_credits"
                : service === "whatsapp_utility"
                  ? "whatsapp_utility_credits"
                  : service === "bulk_whatsapp"
                    ? "bulk_whatsapp_credits"
                    : service === "instagram"
                      ? "instagram_credits"
                      : service === "telegram"
                        ? "telegram_credits"
                        : service
            ] || null,
        })).filter((service) => service.label !== null);

        setMappedServices(mapped);
      } catch (error) {
        console.error("Failed to fetch user services", error);
      }
    };
    fetchUserServices();
  }, []);

  //edite invoice
  // Prefill items if EditInvoiceData.items_detail exists
  useEffect(() => {
    if (EditInvoiceData?.items_detail) {
      try {
        const parsedItems = JSON.parse(EditInvoiceData.items_detail);
        if (Array.isArray(parsedItems)) {
          const mappedItems = parsedItems.map((item) => {
            const price = parseFloat(item.price || 0);
            const quantity = parseFloat(item.quantity || 1);
            const taxAmount = parseFloat(item.tax || 0);

            // Derive GST percentage from taxAmount
            let cgst = 0,
              sgst = 0,
              igst = 0;

            if (item.cgst) {
              const totalGstPercent = (taxAmount / (price * quantity)) * 100;
              cgst = parseFloat(totalGstPercent.toFixed(2));
            } else if (item.sgst) {
              const totalGstPercent = (taxAmount / (price * quantity)) * 100;
              sgst = parseFloat(totalGstPercent.toFixed(2));
            } else if (item.igst) {
              igst = parseFloat(
                ((taxAmount / (price * quantity)) * 100).toFixed(2),
              );
            }

            return {
              products: item.products || "",
              quantity,
              price,
              cgst,
              sgst,
              igst,
              total:
                quantity && price
                  ? quantity * price * (1 + (cgst + sgst + igst) / 100)
                  : 0,
            };
          });

          setItems(mappedItems);
        }
      } catch (err) {
        console.error("Invalid items_detail format:", err);
      }
    }
  }, [EditInvoiceData]);



  const handleAddItem = () => {
    setItems((prevItems) => [
      ...prevItems,
      {
        products: "",
        isCustom: false,
        quantity: 1,
        price: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems.splice(index, 1);
      return newItems.length === 0
        ? [
            {
              products: "",
              isCustom: false,
              quantity: 1,
              price: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              total: 0,
            },
          ]
        : newItems;
    });
  };

  const handleItemChange = (index, event) => {
    const { name, value } = event.target;
    setItems((prevItems) => {
      const newItems = [...prevItems];
      if (name === "products") {
        newItems[index].products = value;
      } else {
        newItems[index][name] = [
          "quantity",
          "price",
          "cgst",
          "sgst",
          "igst",
        ].includes(name)
          ? parseFloat(value)
          : value;
      }

      // Disable CGST & SGST if IGST has value and vice versa
      if (name === "igst" && parseFloat(value) > 0) {
        newItems[index].cgst = 0;
        newItems[index].sgst = 0;
      }
      if (
        (name === "cgst" || name === "sgst") &&
        (newItems[index].cgst > 0 || newItems[index].sgst > 0)
      ) {
        newItems[index].igst = 0;
      }

      const { quantity, price, cgst, sgst, igst } = newItems[index];
      newItems[index].total =
        quantity * price * (1 + (cgst + sgst + igst) / 100);

      return newItems;
    });
  };

  const calculateTotals = () => {
    let newSubtotal = 0,
      newTotalCGST = 0,
      newTotalSGST = 0,
      newTotalIGST = 0;

    items.forEach((item) => {
      newSubtotal += item.quantity * item.price;
      newTotalCGST += item.quantity * item.price * (item.cgst / 100);
      newTotalSGST += item.quantity * item.price * (item.sgst / 100);
      newTotalIGST += item.quantity * item.price * (item.igst / 100);
    });

    const totalTaxAmount = newTotalCGST + newTotalSGST + newTotalIGST;
    const finalTotal = newSubtotal + totalTaxAmount - discount;

    setSubtotal(newSubtotal);
    setTotalCGST(newTotalCGST);
    setTotalSGST(newTotalSGST);
    setTotalIGST(newTotalIGST);
    setTotalTax(totalTaxAmount);
    setTotal(finalTotal > 0 ? finalTotal : 0);
  };

  useEffect(() => {
    calculateTotals();
  }, [items, discount]);

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Details <span className="text-sm font-normal text-gray-500">(at least 1)</span><span className="text-red-500 ml-1">*</span></h3>
      <table className="min-w-full bg-white mb-4">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b text-left">Action</th>
            <th className="py-2 px-4 border-b text-left">Products</th>
            <th className="py-2 px-4 border-b text-left">Quantity</th>
            <th className="py-2 px-4 border-b text-left">Price</th>
            <th className="py-2 px-4 border-b text-left">CGST (%)</th>
            <th className="py-2 px-4 border-b text-left">SGST (%)</th>
            <th className="py-2 px-4 border-b text-left">IGST (%)</th>
            <th className="py-2 px-4 border-b text-left">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isCustomProduct = item.isCustom || (item.products && mappedServices.length > 0 && !mappedServices.some(s => s.value === item.products));
            return (
            <tr key={index}>
              <td className="py-2 px-4 border-b flex items-center">
                <button
                  className="bg-red-500 flex justify-center items-center text-white py-1 px-2 rounded text-sm"
                  onClick={() => handleRemoveItem(index)}
                >
                  &#x2715;
                </button>
              </td>
              <td className="py-2 px-4 border-b">
                {isCustomProduct ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      name="products"
                      value={item.products === 'other' ? '' : item.products}
                      placeholder="Enter product name"
                      onChange={(e) => handleItemChange(index, e)}
                      className="p-1 block w-full border rounded text-sm text-gray-700"
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const newItems = [...items];
                        newItems[index].isCustom = false;
                        newItems[index].products = "";
                        setItems(newItems);
                      }}
                      className="text-gray-500 hover:text-red-500 text-xs px-1"
                    >
                      &#x2715;
                    </button>
                  </div>
                ) : (
                  <select
                    name="products"
                    value={item.products}
                    onChange={(e) => {
                      if (e.target.value === "other") {
                        const newItems = [...items];
                        newItems[index].isCustom = true;
                        newItems[index].products = "";
                        setItems(newItems);
                      } else {
                        handleItemChange(index, e);
                      }
                    }}
                    className="p-1 block w-full border rounded text-sm bg-white text-gray-700"
                  >
                    <option value="" disabled>Select a product</option>
                    {mappedServices.map((service) => (
                      <option key={service.value} value={service.value}>
                        {service.label}
                      </option>
                    ))}
                    <option value="other">Other (Custom)</option>
                  </select>
                )}
              </td>
              <td className="py-2 px-4 border-b">
                <input
                  type="number"
                  name="quantity"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, e)}
                  className="p-1 block w-full border rounded text-sm"
                />
              </td>
              <td className="py-2 px-4 border-b">
                <input
                  type="number"
                  name="price"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, e)}
                  className="p-1 block w-full border rounded text-sm"
                />
              </td>
              <td className="py-2 px-4 border-b">
                <input
                  type="number"
                  name="cgst"
                  value={item.cgst !== undefined ? item.cgst : 0}
                  onChange={(e) => handleItemChange(index, e)}
                  className="p-1 block w-full border rounded text-sm"
                  disabled={item.igst > 0}
                />
              </td>
              <td className="py-2 px-4 border-b">
                <input
                  type="number"
                  name="sgst"
                  value={item.sgst !== undefined ? item.sgst : 0}
                  onChange={(e) => handleItemChange(index, e)}
                  className="p-1 block w-full border rounded text-sm"
                  disabled={item.igst > 0}
                />
              </td>
              <td className="py-2 px-4 border-b">
                <input
                  type="number"
                  name="igst"
                  value={item.igst !== undefined ? item.igst : 0}
                  onChange={(e) => handleItemChange(index, e)}
                  className="p-1 block w-full border rounded text-sm"
                  disabled={item.cgst > 0 || item.sgst > 0}
                />
              </td>
              <td className="py-2 px-4 border-b">
                <input
                  type="number"
                  name="total"
                  value={(item.total || 0).toFixed(2)}
                  readOnly
                  className="p-1 block w-full border rounded text-sm bg-gray-100"
                />
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      <Button variant="primary" size="small" onClick={handleAddItem}>
        Add New Item
      </Button>

      <div className="p-6">
        <div className="flex justify-end items-center mb-6">
          <div className="flex items-center mr-4">
            <label className="mr-2 text-lg font-medium">Discount (₹):</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="p-2 border rounded w-20 text-right"
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="w-1/2"></div>
          <div className="text-right border-t pt-4 w-1/5">
            <p className="text-lg mb-2 flex gap-2 justify-between">
              <span className="font-medium ">Subtotal:</span>
              <span>{subtotal.toFixed(2)}</span>
            </p>
            <p className="text-lg mb-2 flex justify-between">
              <span className="font-medium">Taxes:</span>
              <span>{isNaN(totalTax) ? "-" : totalTax.toFixed(2)}</span>
            </p>
            <p className="text-lg mb-2 flex justify-between">
              <span className="font-medium">Discount:</span>
              <span>{discount > 0 ? `-${discount.toFixed(2)}` : "-"}</span>
            </p>
            <p className="text-xl font-bold flex justify-between">
              <span>Total:</span>
              <span>{total.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsAndServices;
