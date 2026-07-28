function numberToWords(number) {
  if (number === 0) return "INR Zero Only";

  const numStr = Number(number).toFixed(2);
  const [rupees, paise] = numStr.split(".");

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ",
    "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num) {
    if ((num = num.toString()).length > 9) return "overflow";
    const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore " : "";
    str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh " : "";
    str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand " : "";
    str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred " : "";
    str += n[5] != 0 ? (str != "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) : "";
    return str.trim();
  }

  const rsWord = inWords(parseInt(rupees, 10));
  const paiseStr = parseInt(paise, 10) > 0 ? ` and ${parseInt(paise, 10)} paise` : "";
  return `INR ${rsWord}${paiseStr} Only`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
    .replace(/ /g, "-");
}

function fmt(n) {
  return parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

const LEGAL_ENTITY_PATTERN = /(PRIVATE\s+LIMITED|PVT\.?\s*LTD|LIMITED|LLP|INC\.?|CORP\.?|COMPANY)/i;

/** Use legal company name on purchase — skip personal/contact name in the name field. */
function resolveSellerDisplay(rawName, rawAddress) {
  const name = (rawName || "").trim();
  const lines = (rawAddress || "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Company name field is correct — use it and drop duplicate from address
  if (name && LEGAL_ENTITY_PATTERN.test(name)) {
    const addressLines = lines.filter(
      (l) => l.toUpperCase() !== name.toUpperCase()
    );
    return { companyName: name, address: addressLines.join("\n") };
  }

  // Name field is personal — pick legal entity line from address instead
  const legalLineIdx = lines.findIndex((l) => LEGAL_ENTITY_PATTERN.test(l));
  if (legalLineIdx >= 0) {
    return {
      companyName: lines[legalLineIdx],
      address: lines.filter((_, i) => i !== legalLineIdx).join("\n"),
    };
  }

  return {
    companyName: name || "YOUR COMPANY NAME",
    address: lines.join("\n"),
  };
}

import { useData } from "../context/DataContext";

/**
 * Tally-style Tax purchase template matching the sample format.
 * Seller header shows company legal name only — never contact / personal name.
 */
export default function PurchaseTemplate({ purchase, innerRef, className = "" }) {
  const inv = purchase;
  const items = inv.items || [];
  const dataContext = useData();
  const companyInfo = dataContext?.companyInfo || {};

  const taxGroups = {};
  items.forEach((item) => {
    const hsn = item.hsn_sac || "";
    const gst = parseFloat(item.gst_rate || 0);
    if (gst > 0) {
      const key = `${hsn}-${gst}`;
      if (!taxGroups[key]) {
        taxGroups[key] = { hsn, gstRate: gst, taxable: 0, cgstAmt: 0, sgstAmt: 0, totalTax: 0 };
      }
      taxGroups[key].taxable += parseFloat(item.amount || 0);
      taxGroups[key].cgstAmt += parseFloat(item.cgst_amount || 0);
      taxGroups[key].sgstAmt += parseFloat(item.sgst_amount || 0);
      taxGroups[key].totalTax += parseFloat(item.cgst_amount || 0) + parseFloat(item.sgst_amount || 0);
    }
  });

  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const primaryUnit = items.find((i) => i.quantity)?.per || "PCS";
  const { companyName, address: companyAddress } = resolveSellerDisplay(
    inv.company_name,
    inv.company_address
  );
  const taxTotal = parseFloat(inv.total_cgst || 0) + parseFloat(inv.total_sgst || 0);

  return (
    <div
      ref={innerRef}
      className={`purchase-container bg-white text-black text-[12px] leading-relaxed font-sans pb-2 ${className}`}
    >
      <div className="text-center font-bold text-lg mb-2">INVOICE</div>

      <div className="border-[1.5px] border-black">
        {/* Header: Company + Consignee + Supplier | Invoice Meta */}
        <div className="grid grid-cols-2 border-b-[1.5px] border-black">
          <div className="border-r-[1.5px] border-black flex flex-col">
            {/* Company */}
            <div className="p-2 border-b-[1.5px] border-black flex-1">
              <div className="font-bold text-sm">{companyName}</div>
              {companyAddress && (
                <div className="whitespace-pre-line">{companyAddress}</div>
              )}
              {inv.company_gstin && <div>GSTIN/UIN: {inv.company_gstin}</div>}
              <div>
                State Name : {inv.company_state_name || ""}, Code : {inv.company_state_code || ""}
              </div>
            </div>

            {/* Consignee */}
            <div className="p-2 border-b-[1.5px] border-black flex-1">
              <div>Consignee (Ship to)</div>
              <div className="font-bold text-sm">{companyName}</div>
              {companyAddress && (
                <div className="whitespace-pre-line">{companyAddress}</div>
              )}
              {inv.company_gstin && <div>GSTIN/UIN : {inv.company_gstin}</div>}
              <div>
                State Name : {inv.company_state_name || ""}, Code : {inv.company_state_code || ""}
              </div>
            </div>

            {/* Supplier */}
            <div className="p-2 flex-1">
              <div>Supplier (Bill from)</div>
              <div className="font-bold text-sm">{inv.vendor_name}</div>
              {inv.vendor_address && (
                <div className="whitespace-pre-line">{inv.vendor_address}</div>
              )}
              {inv.vendor_gstin && <div>GSTIN/UIN : {inv.vendor_gstin}</div>}
              <div>
                State Name : {inv.vendor_state_name || ""}, Code : {inv.vendor_state_code || ""}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="grid grid-cols-2 flex-1">
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2">
                Invoice No.
                <br />
                <span className="font-bold">{inv.purchase_no}</span>
              </div>
              <div className="border-b-[1.5px] border-black p-2">
                Dated
                <br />
                <span className="font-bold">{formatDate(inv.date)}</span>
              </div>
              <div className="border-r-[1.5px] border-black p-2">
                Supplier Invoice No. &amp; Date.
                <br />
                <span className="font-bold">
                  {inv.reference_no || inv.vendor_order_no || ""}
                </span>
              </div>
              <div className="p-2">
                Other References
                <br />
                <span className="font-bold">{inv.other_references || ""}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full border-collapse border-b-[1.5px] border-black table-fixed">
          <thead>
            <tr className="border-b-[1.5px] border-black text-center h-8">
              <th className="border-r-[1.5px] border-black w-10 p-1 font-semibold">
                Sl
                <br />
                No.
              </th>
              <th className="border-r-[1.5px] border-black p-1 font-semibold">
                Particulars
              </th>
              <th className="border-r-[1.5px] border-black w-20 p-1 font-semibold">Quantity</th>
              <th className="border-r-[1.5px] border-black w-20 p-1 font-semibold">Rate</th>
              <th className="border-r-[1.5px] border-black w-12 p-1 font-semibold">per</th>
              <th className="w-28 p-1 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="border-r-[1.5px] border-black text-center p-1 border-b-transparent border-t-transparent">
                  {idx + 1}
                </td>
                <td className="border-r-[1.5px] border-black p-1 border-b-transparent border-t-transparent">
                  <span className="font-bold">{item.description}</span>
                </td>
                <td className="border-r-[1.5px] border-black text-right p-1 font-bold border-b-transparent border-t-transparent">
                  {item.quantity ? `${parseFloat(item.quantity).toFixed(2)}` : ""}
                </td>
                <td className="border-r-[1.5px] border-black text-right p-1 border-b-transparent border-t-transparent">
                  {item.rate ? fmt(item.rate) : ""}
                </td>
                <td className="border-r-[1.5px] border-black text-center p-1 border-b-transparent border-t-transparent">
                  {item.quantity ? item.per || "" : ""}
                </td>
                <td className="text-right p-1 font-bold border-b-transparent border-t-transparent">
                  {fmt(item.amount)}
                </td>
              </tr>
            ))}

            {parseFloat(inv.total_cgst) > 0 && (
              <tr>
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black text-right p-1 pr-10 font-bold border-t-transparent border-b-transparent">
                  INPUT CGST
                </td>
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="text-right p-1 font-bold border-t-transparent border-b-transparent">
                  {fmt(inv.total_cgst)}
                </td>
              </tr>
            )}
            {parseFloat(inv.total_sgst) > 0 && (
              <tr>
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black text-right p-1 pr-10 font-bold border-t-transparent border-b-transparent">
                  INPUT SGST
                </td>
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="text-right p-1 font-bold border-t-transparent border-b-transparent">
                  {fmt(inv.total_sgst)}
                </td>
              </tr>
            )}
            {parseFloat(inv.round_off) !== 0 && (
              <tr>
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black text-left font-bold p-1 pl-4 uppercase border-t-transparent border-b-transparent">
                  ROUND OFF
                </td>
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="border-r-[1.5px] border-black border-t-transparent border-b-transparent" />
                <td className="text-right p-1 font-bold border-t-transparent border-b-transparent">
                  {fmt(inv.round_off)}
                </td>
              </tr>
            )}

            <tr className="h-40">
              <td className="border-r-[1.5px] border-black border-b-transparent border-t-transparent" />
              <td className="border-r-[1.5px] border-black border-b-transparent border-t-transparent" />
              <td className="border-r-[1.5px] border-black border-b-transparent border-t-transparent" />
              <td className="border-r-[1.5px] border-black border-b-transparent border-t-transparent" />
              <td className="border-r-[1.5px] border-black border-b-transparent border-t-transparent" />
              <td className="border-b-transparent border-t-transparent" />
            </tr>

            <tr className="border-t-[1.5px] border-black">
              <td colSpan={5} className="border-r-[1.5px] border-black text-right p-1 pr-4 font-semibold">
                Total
              </td>
              <td className="p-1 text-right text-sm font-bold">₹ {fmt(inv.grand_total)}</td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Section */}
        <div className="flex">
          <div className="w-[60%] p-2 flex flex-col justify-between">
            <div>
              <div>Amount Chargeable (in words)</div>
              <div className="font-bold mt-1">{inv.amount_in_words}</div>
            </div>
            <div className="mt-8 flex gap-2">
              <span>Company&apos;s GSTIN/UIN</span>
              <span className="font-bold">: {inv.vendor_gstin || ""}</span>
            </div>
          </div>

          <div className="w-[40%] flex flex-col justify-between items-end border-l-[1.5px] border-black">
            <div className="italic pr-2 pt-1 text-xs">E. &amp; O.E</div>
            
            <div className="w-full mt-4 border-t-[1.5px] border-black p-2 text-right flex flex-col justify-between min-h-[90px] relative">
              <div className="font-bold relative z-10">For {inv.authorised_signatory_for || inv.vendor_name}</div>
              {companyInfo?.signature_url && (
                <div className="absolute inset-0 flex items-center justify-end pr-2 pt-4 opacity-90 pointer-events-none">
                  <img src={companyInfo.signature_url} alt="Signature" className="max-h-12 max-w-[120px] object-contain" crossOrigin="anonymous" />
                </div>
              )}
              <div className="relative z-10 mt-10">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







