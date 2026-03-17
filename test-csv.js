const text = `"Name","Phone","Email"\n"Rev. Joey Whitlock, Leigh","7068869595",""\n`;
const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
const headers = lines[0].toLowerCase().split(",").map(h => h.trim());

const nameIdx = headers.findIndex(h => h.includes("name"));
const phoneIdx = headers.findIndex(h => h.includes("phone"));
const emailIdx = headers.findIndex(h => h.includes("email"));

console.log({ nameIdx, phoneIdx, emailIdx, headers });

const parseCSVRow = (row) => {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < row.length; i++) {
        if (row[i] === '"') {
            inQuote = !inQuote;
        } else if (row[i] === ',' && !inQuote) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += row[i];
        }
    }
    result.push(cur.trim());
    return result;
};

for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    console.log("Row:", row);
    const phoneRaw = row[phoneIdx];
    console.log("Phone raw:", phoneRaw);
}
