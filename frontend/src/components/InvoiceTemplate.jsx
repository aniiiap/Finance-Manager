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

/** Use legal company name on invoice — skip personal/contact name in the name field. */
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

/**
 * Tally-style Tax Invoice template matching the sample format.
 * Seller header shows company legal name only — never contact / personal name.
 */
export default function InvoiceTemplate({ invoice, innerRef, className = "" }) {
  const inv = invoice;
  const items = inv.items || [];

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
      className={`invoice-container border border-black bg-white text-black text-[11px] leading-tight font-sans ${className}`}
    >
      <div className="text-center font-bold text-sm border-b border-black py-1">Tax Invoice</div>

      {/* Header: company + buyer | invoice meta + terms */}
      <div className="grid grid-cols-2 border-b border-black">
        <div className="border-r border-black flex flex-col">
          {/* Seller — company legal name only */}
          <div className="p-2 border-b border-black">
            <div className="font-bold text-sm">{companyName}</div>
            {companyAddress && (
              <div className="whitespace-pre-line">{companyAddress}</div>
            )}
            {inv.company_gstin && <div>GSTIN/UIN: {inv.company_gstin}</div>}
            <div>
              State Name : {inv.company_state_name || ""}, Code : {inv.company_state_code || ""}
            </div>
          </div>

          {/* Buyer */}
          <div className="p-2 flex-1">
            <div>Buyer (Bill to)</div>
            <div className="font-bold text-sm">{inv.buyer_name}</div>
            {inv.buyer_address && (
              <div className="whitespace-pre-line">{inv.buyer_address}</div>
            )}
            {inv.buyer_gstin && <div>GSTIN/UIN: {inv.buyer_gstin}</div>}
            <div>
              State Name : {inv.buyer_state_name || ""}, Code : {inv.buyer_state_code || ""}
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="grid grid-cols-2 flex-1">
            <div className="border-b border-r border-black p-1">
              Invoice No.
              <br />
              <span className="font-bold">{inv.invoice_no}</span>
            </div>
            <div className="border-b border-black p-1">
              Dated
              <br />
              <span className="font-bold">{formatDate(inv.date)}</span>
            </div>
            <div className="border-b border-r border-black p-1">
              Delivery Note
              <br />
              <span className="font-bold">{inv.delivery_note || ""}</span>
            </div>
            <div className="border-b border-black p-1">
              Mode/Terms of Payment
              <br />
              <span className="font-bold">{inv.payment_terms || ""}</span>
            </div>
            <div className="border-b border-r border-black p-1">
              Reference No. &amp; Date.
              <br />
              <span className="font-bold">{inv.reference_no || ""}</span>
            </div>
            <div className="border-b border-black p-1">
              Other References
              <br />
              <span className="font-bold">{inv.other_references || ""}</span>
            </div>
            <div className="border-b border-r border-black p-1">
              Buyer&apos;s Order No.
              <br />
              <span className="font-bold">{inv.buyer_order_no || ""}</span>
            </div>
            <div className="border-b border-black p-1">
              Dated
              <br />
              <span className="font-bold">
                {inv.buyer_order_date ? formatDate(inv.buyer_order_date) : ""}
              </span>
            </div>
            <div className="border-b border-r border-black p-1">
              Dispatch Doc No.
              <br />
              <span className="font-bold">{inv.dispatch_doc_no || ""}</span>
            </div>
            <div className="border-b border-black p-1">
              Delivery Note Date
              <br />
              <span className="font-bold">
                {inv.delivery_note_date ? formatDate(inv.delivery_note_date) : ""}
              </span>
            </div>
            <div className="border-b border-r border-black p-1">
              Dispatched through
              <br />
              <span className="font-bold">{inv.dispatch_through || ""}</span>
            </div>
            <div className="border-b border-black p-1">
              Destination
              <br />
              <span className="font-bold">{inv.destination || ""}</span>
            </div>
          </div>
          <div className="p-1 min-h-[48px]">
            Terms of Delivery
            <br />
            <span className="font-bold">{inv.terms_of_delivery || ""}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse border-b border-black table-fixed">
        <thead>
          <tr className="border-b border-black text-center">
            <th className="border-r border-black w-8 p-1 font-normal">
              SI
              <br />
              No.
            </th>
            <th className="border-r border-black p-1 font-normal">
              Description of
              <br />
              Goods and Services
            </th>
            <th className="border-r border-black w-20 p-1 font-normal">HSN/SAC</th>
            <th className="border-r border-black w-20 p-1 font-normal">Quantity</th>
            <th className="border-r border-black w-20 p-1 font-normal">Rate</th>
            <th className="border-r border-black w-10 p-1 font-normal">per</th>
            <th className="w-24 p-1 font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="align-top">
              <td className="border-r border-black text-center p-1 border-b-transparent border-t-transparent">
                {idx + 1}
              </td>
              <td className="border-r border-black p-1 border-b-transparent border-t-transparent">
                <span className="font-bold">{item.description}</span>
              </td>
              <td className="border-r border-black text-center p-1 border-b-transparent border-t-transparent">
                {item.hsn_sac || ""}
              </td>
              <td className="border-r border-black text-right p-1 font-bold border-b-transparent border-t-transparent">
                {item.quantity ? `${parseFloat(item.quantity).toFixed(2)} ${item.per || ""}` : ""}
              </td>
              <td className="border-r border-black text-right p-1 border-b-transparent border-t-transparent">
                {item.rate ? fmt(item.rate) : ""}
              </td>
              <td className="border-r border-black text-center p-1 border-b-transparent border-t-transparent">
                {item.quantity ? item.per || "" : ""}
              </td>
              <td className="text-right p-1 font-bold border-b-transparent border-t-transparent">
                {fmt(item.amount)}
              </td>
            </tr>
          ))}

          <tr className="h-24">
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td />
          </tr>

          <tr>
            <td className="border-r border-black border-t-transparent" />
            <td className="border-r border-black border-t-transparent" />
            <td className="border-r border-black border-t-transparent" />
            <td className="border-r border-black border-t-transparent" />
            <td className="border-r border-black border-t-transparent" />
            <td className="border-r border-black border-t-transparent" />
            <td className="text-right p-1 font-bold border-t border-black">
              {fmt(inv.total_taxable_amount)}
            </td>
          </tr>

          {parseFloat(inv.total_cgst) > 0 && (
            <tr>
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black text-right p-1 pr-6 italic border-t-transparent border-b-transparent">
                Output Cgst
              </td>
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="text-right p-1 border-t-transparent border-b-transparent">
                {fmt(inv.total_cgst)}
              </td>
            </tr>
          )}
          {parseFloat(inv.total_sgst) > 0 && (
            <tr>
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black text-right p-1 pr-6 italic border-t-transparent border-b-transparent">
                Output Sgst
              </td>
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="text-right p-1 border-t-transparent border-b-transparent">
                {fmt(inv.total_sgst)}
              </td>
            </tr>
          )}
          {parseFloat(inv.round_off) !== 0 && (
            <tr>
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black text-right p-1 pr-6 italic uppercase border-t-transparent border-b-transparent">
                ROUND OFF
              </td>
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="border-r border-black border-t-transparent border-b-transparent" />
              <td className="text-right p-1 border-t-transparent border-b-transparent">
                {fmt(inv.round_off)}
              </td>
            </tr>
          )}

          <tr className="border-t border-black font-bold">
            <td colSpan={3} className="border-r border-black text-right p-1 pr-4">
              Total
            </td>
            <td className="border-r border-black p-1 text-center">
              {totalQty > 0 ? `${totalQty} ${primaryUnit}` : ""}
            </td>
            <td colSpan={2} className="border-r border-black" />
            <td className="p-1 text-right text-sm font-bold">₹ {fmt(inv.grand_total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-b border-black p-1 px-2">
        <div>Amount Chargeable (in words)</div>
        <div className="font-bold">{inv.amount_in_words}</div>
        <div className="text-right italic -mt-4 pr-1">E. &amp; O.E</div>
      </div>

      {Object.keys(taxGroups).length > 0 && (
        <table className="w-full border-collapse border-b border-black text-center table-fixed">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black p-1 font-normal w-[25%]" rowSpan={2}>
                HSN/SAC
              </th>
              <th className="border-r border-black p-1 font-normal w-[15%]" rowSpan={2}>
                Taxable
                <br />
                Value
              </th>
              <th className="border-r border-black p-1 font-normal w-[25%]" colSpan={2}>
                Central Tax
              </th>
              <th className="border-r border-black p-1 font-normal w-[25%]" colSpan={2}>
                State Tax
              </th>
              <th className="p-1 font-normal w-[10%]" rowSpan={2}>
                Total
                <br />
                Tax Amount
              </th>
            </tr>
            <tr className="border-b border-black">
              <th className="border-r border-t border-black p-1 font-normal">Rate</th>
              <th className="border-r border-t border-black p-1 font-normal">Amount</th>
              <th className="border-r border-t border-black p-1 font-normal">Rate</th>
              <th className="border-r border-t border-black p-1 font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(taxGroups).map((tg, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="border-r border-black p-1 text-left">{tg.hsn}</td>
                <td className="border-r border-black p-1 text-right">{fmt(tg.taxable)}</td>
                <td className="border-r border-black p-1">{tg.gstRate / 2}%</td>
                <td className="border-r border-black p-1 text-right">{fmt(tg.cgstAmt)}</td>
                <td className="border-r border-black p-1">{tg.gstRate / 2}%</td>
                <td className="border-r border-black p-1 text-right">{fmt(tg.sgstAmt)}</td>
                <td className="p-1 text-right">{fmt(tg.totalTax)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="border-r border-black p-1 text-right">Total</td>
              <td className="border-r border-black p-1 text-right">{fmt(inv.total_taxable_amount)}</td>
              <td className="border-r border-black p-1" />
              <td className="border-r border-black p-1 text-right">{fmt(inv.total_cgst)}</td>
              <td className="border-r border-black p-1" />
              <td className="border-r border-black p-1 text-right">{fmt(inv.total_sgst)}</td>
              <td className="p-1 text-right">{fmt(taxTotal)}</td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="p-1 px-2 border-b border-black flex">
        <span className="mr-2">Tax Amount (in words) :</span>
        <span className="font-bold">
          {Object.keys(taxGroups).length > 0 ? numberToWords(taxTotal) : "INR Zero Only"}
        </span>
      </div>

      <div className="flex justify-between p-1 px-2">
        <div className="w-1/2 flex flex-col justify-end text-[10px] pr-2">
          <div>Declaration</div>
          <div>
            We declare that this invoice shows the actual price of
            <br />
            the goods described and that all particulars are true
            <br />
            and correct.
          </div>
        </div>

        <div className="w-1/2">
          <div className="mb-1">Company&apos;s Bank Details</div>
          <div className="flex">
            <div className="w-28">Bank Name</div>
            <div className="font-bold">: {inv.bank_name || ""}</div>
          </div>
          <div className="flex">
            <div className="w-28">A/c No.</div>
            <div className="font-bold">: {inv.bank_account_no || ""}</div>
          </div>
          <div className="flex">
            <div className="w-28">Branch &amp; IFS Code</div>
            <div className="font-bold">: {inv.bank_ifsc || ""}</div>
          </div>

          <div className="mt-2 border border-black p-1 text-right flex flex-col justify-between h-20">
            <div className="font-bold">for {companyName}</div>
            <div>Authorised Signatory</div>
          </div>
        </div>
      </div>

      <div className="text-center py-1 border-t border-black text-[10px]">
        This is a Computer Generated Invoice
      </div>
    </div>
  );
}
