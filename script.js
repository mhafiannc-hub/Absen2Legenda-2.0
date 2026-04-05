let expenses = [];
let categories = ['Operasional', 'Bahan Baku', 'Gaji', 'Listrik/Air', 'Lain-lain'];
let logs = [];
const currencyInputIds = ['input-modal', 'input-dinein', 'input-cash', 'input-qris', 'input-shopeefood', 'input-gofood', 'input-grabfood'];

window.onload = () => {
    loadInitialData();
    renderCategories();
    renderExpenseInputs();
    renderLogs();
    calculateTotals();

    const inputs = ['input-date', 'input-shift', 'input-modal', 'input-dinein', 'input-cash', 'input-qris', 'input-shopeefood', 'input-gofood', 'input-grabfood', 'input-reporter', 'input-branch'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            saveDraft();
            calculateTotals();
        });
    });

    currencyInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', (event) => {
            formatCurrencyField(event.target);
        });
    });
};

function saveDraft() {
    const draft = {
        reporter: document.getElementById('input-reporter').value,
        branch: document.getElementById('input-branch').value,
        date: document.getElementById('input-date').value,
        shift: document.getElementById('input-shift').value,
        modal: getCurrencyValue('input-modal'),
        dinein: getCurrencyValue('input-dinein'),
        cash: getCurrencyValue('input-cash'),
        qris: getCurrencyValue('input-qris'),
        shopeefood: getCurrencyValue('input-shopeefood'),
        gofood: getCurrencyValue('input-gofood'),
        grabfood: getCurrencyValue('input-grabfood'),
        categories, expenses
    };
    localStorage.setItem('duaLegendaDraft', JSON.stringify(draft));
}

function loadInitialData() {
    const savedDraft = localStorage.getItem('duaLegendaDraft');
    if (savedDraft) {
        const d = JSON.parse(savedDraft);
        document.getElementById('input-reporter').value = d.reporter || '';
        document.getElementById('input-branch').value = d.branch || 'Depot 2 Legenda';
        document.getElementById('input-date').value = d.date || new Date().toISOString().split('T')[0];
        document.getElementById('input-shift').value = d.shift || 'Shift 1';
        setCurrencyField('input-modal', d.modal);
        setCurrencyField('input-dinein', d.dinein);
        setCurrencyField('input-cash', d.cash);
        setCurrencyField('input-qris', d.qris);
        setCurrencyField('input-shopeefood', d.shopeefood);
        setCurrencyField('input-gofood', d.gofood);
        setCurrencyField('input-grabfood', d.grabfood);
        if (d.categories) categories = d.categories;
        if (d.expenses) expenses = d.expenses;
    } else {
        document.getElementById('input-date').value = new Date().toISOString().split('T')[0];
        expenses = [{ id: Date.now(), description: '', category: categories[0], price: 0, qty: 1, image: null }];
    }
    const savedLogs = localStorage.getItem('duaLegendaLogs');
    if (savedLogs) logs = JSON.parse(savedLogs);
}

function saveToLog() {
    const d = getReportData();
    const logItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('id-ID'),
        reporter: d.reporter, branch: d.branch, date: d.date, shift: d.shift,
        totalIncome: d.totalIncome, fullData: d
    };
    logs.unshift(logItem);
    localStorage.setItem('duaLegendaLogs', JSON.stringify(logs));
    renderLogs();
    showMessage('Laporan berhasil disimpan ke log riwayat!');
}

function renderLogs() {
    const body = document.getElementById('log-list-body');
    if (logs.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-gray-400 italic">Belum ada riwayat laporan tersimpan.</td></tr>';
        return;
    }
    body.innerHTML = logs.map(l => `
        <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
            <td class="py-3 px-2 text-xs font-bold">${l.date}<br><span class="text-[9px] opacity-60">${l.shift}</span></td>
            <td class="py-3 px-2 text-[10px] font-medium">${l.branch}</td>
            <td class="py-3 px-2 text-[10px] font-black text-indigo-600">${formatIDR(l.totalIncome)}</td>
            <td class="py-3 px-2 text-center">
                <button onclick="restoreFromLog(${l.id})" class="text-blue-500 mr-2"><i class="fas fa-folder-open"></i></button>
                <button onclick="deleteLog(${l.id})" class="text-red-300"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

function deleteLog(id) {
    if (confirm('Tuan, hapus riwayat ini dari memori perangkat?')) {
        logs = logs.filter(l => l.id !== id);
        localStorage.setItem('duaLegendaLogs', JSON.stringify(logs));
        renderLogs();
    }
}

function restoreFromLog(id) {
    const item = logs.find(l => l.id === id);
    if (item && confirm('Muat data laporan ini ke formulir?')) {
        const d = item.fullData;
        document.getElementById('input-reporter').value = d.reporter;
        document.getElementById('input-branch').value = d.branch;
        document.getElementById('input-date').value = d.date;
        document.getElementById('input-shift').value = d.shift;
        setCurrencyField('input-modal', d.modal);
        setCurrencyField('input-dinein', d.dinein);
        setCurrencyField('input-cash', d.cash);
        setCurrencyField('input-qris', d.qris);
        setCurrencyField('input-shopeefood', d.shopee);
        setCurrencyField('input-gofood', d.gofood);
        setCurrencyField('input-grabfood', d.grab);
        expenses = d.expenses;
        renderExpenseInputs(); calculateTotals(); saveDraft();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function resetDraft() {
    if (confirm('Bersihkan formulir?')) { localStorage.removeItem('duaLegendaDraft'); location.reload(); }
}

function parseCurrency(value) {
    if (typeof value === 'number') return value;
    const digits = String(value || '').replace(/\D/g, '');
    return digits ? Number(digits) : 0;
}

function formatInputIDR(value) {
    const amount = parseCurrency(value);
    return amount ? formatIDR(amount) : '';
}

function formatCurrencyField(input) {
    input.value = formatInputIDR(input.value);
}

function setCurrencyField(id, value) {
    document.getElementById(id).value = formatInputIDR(value);
}

function getCurrencyValue(id) {
    return parseCurrency(document.getElementById(id).value);
}

function formatIDR(val) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function calculateTotals() {
    const modal = getCurrencyValue('input-modal');
    const dinein = getCurrencyValue('input-dinein');
    const cash = getCurrencyValue('input-cash');
    const qris = getCurrencyValue('input-qris');
    const shopee = getCurrencyValue('input-shopeefood');
    const gofood = getCurrencyValue('input-gofood');
    const grab = getCurrencyValue('input-grabfood');

    const totalIncome = cash + qris;
    const totalExpense = expenses.reduce((acc, cur) => acc + (cur.price * cur.qty), 0);
    const grossProfit = dinein - totalExpense;
    const gap = totalIncome - grossProfit;

    document.getElementById('res-branch').innerText = document.getElementById('input-branch').value;
    document.getElementById('res-date').innerText = 'Tgl: ' + (document.getElementById('input-date').value || '-');
    document.getElementById('res-shift').innerText = 'Shift: ' + document.getElementById('input-shift').value;
    document.getElementById('res-reporter').innerText = 'Kasir: ' + (document.getElementById('input-reporter').value || '-');
    document.getElementById('res-modal').innerText = formatIDR(modal);
    document.getElementById('res-dinein').innerText = formatIDR(dinein);
    document.getElementById('res-cash').innerText = formatIDR(cash);
    document.getElementById('res-qris').innerText = formatIDR(qris);
    document.getElementById('res-shopeefood').innerText = formatIDR(shopee);
    document.getElementById('res-gofood').innerText = formatIDR(gofood);
    document.getElementById('res-grabfood').innerText = formatIDR(grab);
    document.getElementById('res-total-income').innerText = formatIDR(totalIncome);
    document.getElementById('res-total-expense').innerText = formatIDR(totalExpense);
    document.getElementById('res-gross-profit').innerText = formatIDR(grossProfit);

    const gapEl = document.getElementById('res-gap');
    gapEl.innerText = formatIDR(gap);
    gapEl.className = gap < 0 ? 'text-red-600 font-bold' : (gap > 0 ? 'text-green-600 font-bold' : 'text-black font-bold');

    const list = document.getElementById('res-expense-list');
    list.innerHTML = expenses.length > 0 ? expenses.map(e => `<div class="flex justify-between"><span>${e.qty}x ${e.description || '...'}</span><span>${formatIDR(e.price * e.qty)}</span></div>`).join('') : '<div class="text-center italic opacity-40 py-2">Belum ada pengeluaran</div>';
    document.getElementById('print-timestamp').innerText = new Date().toLocaleString('id-ID');
}

function renderExpenseInputs() {
    const container = document.getElementById('expense-container');
    container.innerHTML = expenses.map(exp => `
        <div class="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 transition-all expense-card">
            <div class="grid grid-cols-12 gap-4 items-start">
                <div class="col-span-12 lg:col-span-5">
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Deskripsi Item</label>
                    <textarea placeholder="..." oninput="updateExpense(${exp.id}, 'description', this.value)"
                        class="w-full text-sm rounded-xl border-gray-200 p-3 border focus:ring-2 focus:ring-blue-500 outline-none min-h-[42px] resize-none">${exp.description}</textarea>
                </div>
                <div class="col-span-12 sm:col-span-6 lg:col-span-2">
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Kategori</label>
                    <select onchange="updateExpense(${exp.id}, 'category', this.value)" class="w-full text-sm rounded-xl border-gray-200 p-3 border bg-gray-50 h-[46px]">
                        ${categories.map(c => `<option value="${c}" ${exp.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="col-span-12 sm:col-span-6 lg:col-span-2">
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1 text-right">Harga Satuan</label>
                    <input type="text" inputmode="numeric" value="${formatInputIDR(exp.price)}" oninput="this.value = formatInputIDR(this.value); updateExpense(${exp.id}, 'price', this.value)"
                        class="w-full text-sm rounded-xl border-gray-200 p-3 border focus:ring-2 focus:ring-blue-500 outline-none font-bold h-[46px] text-right">
                </div>
                <div class="col-span-6 lg:col-span-1">
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1 text-center">Qty</label>
                    <input type="number" value="${exp.qty}" oninput="updateExpense(${exp.id}, 'qty', this.value)"
                        class="w-full text-sm rounded-xl border-gray-300 p-3 border text-center h-[46px] font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div class="col-span-6 lg:col-span-2 flex flex-col">
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Nota Fisik</label>
                    <div class="flex items-center gap-2">
                        <label class="cursor-pointer bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-2 flex items-center justify-center hover:bg-blue-100 transition shadow-sm w-full h-[46px]">
                            <i class="fas fa-camera text-blue-500 text-lg"></i>
                            <input type="file" accept="image/*" capture="environment" class="hidden" onchange="handleImage(${exp.id}, event)">
                        </label>
                        ${exp.image ? `<img src="${exp.image}" class="image-preview-thumb shadow-sm">` : ''}
                    </div>
                </div>
                <button onclick="removeExpenseRow(${exp.id})" class="absolute top-3 right-3 bg-red-500 text-white w-7 h-7 rounded-full shadow-lg hover:bg-red-700 transition flex items-center justify-center">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        </div>`).join('');
}

function updateExpense(id, field, value) {
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
        if (field === 'price') {
            expenses[idx][field] = parseCurrency(value);
        } else if (field === 'qty') {
            expenses[idx][field] = parseFloat(value) || 0;
        } else {
            expenses[idx][field] = value;
        }
        saveDraft();
        calculateTotals();
    }
}

function addExpenseRow() { expenses.push({ id: Date.now(), description: '', category: categories[0], price: 0, qty: 1, image: null }); saveDraft(); renderExpenseInputs(); calculateTotals(); }
function removeExpenseRow(id) { expenses = expenses.filter(e => e.id !== id); saveDraft(); renderExpenseInputs(); calculateTotals(); }

function handleImage(id, event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { const idx = expenses.findIndex(ex => ex.id === id); if (idx !== -1) { expenses[idx].image = e.target.result; saveDraft(); renderExpenseInputs(); } };
    reader.readAsDataURL(file);
}

function renderCategories() {
    const container = document.getElementById('category-chips');
    container.innerHTML = categories.map((cat, idx) => `
        <div class="flex items-center bg-white px-3 py-1 rounded-full text-[10px] font-bold border border-purple-200 text-purple-700 shadow-sm">
            <span>${cat}</span><button onclick="removeCategory(${idx})" class="ml-2 text-red-400 font-bold">x</button>
        </div>`).join('');
    renderExpenseInputs();
}

function addCategory() { const input = document.getElementById('new-cat-input'); const val = input.value.trim(); if (val && !categories.includes(val)) { categories.push(val); input.value = ''; saveDraft(); renderCategories(); } }
function removeCategory(idx) { if (categories.length > 1) { categories.splice(idx, 1); saveDraft(); renderCategories(); } }

function getReportData() {
    const cash = getCurrencyValue('input-cash');
    const qris = getCurrencyValue('input-qris');
    const modal = getCurrencyValue('input-modal');
    const dinein = getCurrencyValue('input-dinein');
    const totalExpense = expenses.reduce((acc, cur) => acc + (cur.price * cur.qty), 0);
    return {
        branch: document.getElementById('input-branch').value, reporter: document.getElementById('input-reporter').value || '-',
        date: document.getElementById('input-date').value || '-', shift: document.getElementById('input-shift').value,
        modal, dinein, cash, qris,
        shopee: getCurrencyValue('input-shopeefood'),
        gofood: getCurrencyValue('input-gofood'),
        grab: getCurrencyValue('input-grabfood'),
        totalIncome: cash + qris, totalExpense, grossProfit: dinein - totalExpense,
        expenses: [...expenses]
    };
}

function printType(type) {
    const area = document.getElementById('print-area'); const data = getReportData(); area.innerHTML = ''; document.body.className = '';
    if (type === 'receipt') { document.body.classList.add('print-receipt'); area.appendChild(document.getElementById('receipt-preview').cloneNode(true)); }
    else if (type === 'pdf') { document.body.classList.add('print-pdf'); area.innerHTML = generateA4Report(data) + '<div class="page-break"></div>' + generateNotaAttachment(data); }
    else if (type === 'attachment') { document.body.classList.add('print-attachment'); area.innerHTML = generateNotaAttachment(data); }
    setTimeout(() => { window.print(); }, 350);
}

function generateA4Report(d) {
    const gap = d.totalIncome - d.grossProfit;
    return `<div class="p-8 bg-white font-sans text-sm">
        <div class="flex justify-between items-start border-b-4 border-gray-900 pb-4 mb-6">
            <div><h1 class="text-3xl font-black uppercase tracking-tighter">Dua Legenda Grup</h1><p class="text-lg font-bold text-gray-500">${d.branch.toUpperCase()}</p></div>
            <div class="text-right font-bold uppercase"><h2 class="text-xl">Laporan Closing</h2><p class="text-gray-600">${d.date} | ${d.shift}</p></div>
        </div>
        <div class="grid grid-cols-2 gap-8 mb-6">
            <div class="space-y-2">
                <h3 class="text-lg font-bold border-b border-gray-300 uppercase tracking-widest text-blue-800">Ringkasan Kas</h3>
                <div class="flex justify-between"><span>Pelapor:</span><span class="font-bold">${d.reporter}</span></div>
                <div class="flex justify-between"><span>Modal Awal:</span><span>${formatIDR(d.modal)}</span></div>
                <div class="flex justify-between"><span>Cash Fisik:</span><span>${formatIDR(d.cash)}</span></div>
                <div class="flex justify-between"><span>Transfer/QRIS:</span><span>${formatIDR(d.qris)}</span></div>
                <div class="flex justify-between border-t-2 border-black pt-2 font-black text-xl"><span>Total Didapat:</span><span>${formatIDR(d.totalIncome)}</span></div>
            </div>
            <div class="space-y-2">
                <h3 class="text-lg font-bold border-b border-gray-300 uppercase tracking-widest text-indigo-800">Hasil Akhir</h3>
                <div class="flex justify-between"><span>Omzet (Dine In):</span><span>${formatIDR(d.dinein)}</span></div>
                <div class="flex justify-between"><span>Total Keluar:</span><span class="text-red-600">${formatIDR(d.totalExpense)}</span></div>
                <div class="flex justify-between text-xl font-bold mt-2"><span>LABA KOTOR:</span><span>${formatIDR(d.grossProfit)}</span></div>
                <div class="p-3 bg-gray-100 rounded-lg flex justify-between text-2xl font-black"><span>SELISIH:</span><span>${formatIDR(gap)}</span></div>
            </div>
        </div>
        <div class="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
            <h3 class="text-[10px] font-black text-orange-700 mb-2 uppercase tracking-widest text-center">Data Online Food</h3>
            <div class="grid grid-cols-3 gap-4 text-center">
                <div><p class="text-[9px] text-gray-500 uppercase">Shopee</p><p class="font-bold text-sm">${formatIDR(d.shopee)}</p></div>
                <div><p class="text-[9px] text-gray-500 uppercase">GoFood</p><p class="font-bold text-sm">${formatIDR(d.gofood)}</p></div>
                <div><p class="text-[9px] text-gray-500 uppercase">GrabFood</p><p class="font-bold text-sm">${formatIDR(d.grab)}</p></div>
            </div>
        </div>
        <table class="w-full border-collapse mb-8 text-xs">
            <thead><tr class="bg-gray-100"><th class="border p-2 text-left">Deskripsi</th><th class="border p-2 text-center">Qty</th><th class="border p-2 text-right">Subtotal</th></tr></thead>
            <tbody>${d.expenses.map(e => `<tr><td class="border p-2">${e.description || '-'}</td><td class="border p-2 text-center">${e.qty}</td><td class="border p-2 text-right font-bold">${formatIDR(e.price * e.qty)}</td></tr>`).join('')}</tbody>
        </table>
        <div class="mt-20 flex justify-end gap-20 text-center"><div class="w-48 border-t border-black pt-2 font-bold">${d.reporter}</div><div class="w-48 border-t border-black pt-2">( Manager )</div></div>
    </div>`;
}

function generateNotaAttachment(d) {
    const filtered = d.expenses.filter(e => e.image);
    return `<div class="p-8 bg-white min-h-screen">
        <h1 class="text-2xl font-black text-center border-b-2 border-black pb-4 uppercase">Lampiran Nota Pengeluaran</h1>
        <div class="flex justify-between my-4 text-xs font-bold uppercase tracking-widest"><span>Unit: ${d.branch}</span><span>Tgl: ${d.date}</span></div>
        <div class="grid grid-cols-2 gap-6 mt-6">
            ${filtered.length > 0 ? filtered.map(e => `
                <div class="border border-gray-200 p-4 rounded-2xl break-inside-avoid bg-gray-50 flex flex-col items-center shadow-sm">
                    <img src="${e.image}" class="max-w-full max-h-[380px] object-contain mb-3">
                    <div class="text-center w-full border-t border-gray-200 pt-2"><p class="font-bold uppercase text-[10px]">${e.description || 'Nota'}</p><p class="text-[9px] text-gray-400">${formatIDR(e.price * e.qty)}</p></div>
                </div>`).join('') : '<p class="col-span-2 text-center py-20 italic font-bold border-2 border-dashed border-gray-200 rounded-2xl">Tidak ada foto nota diunggah.</p>'}
        </div>
    </div>`;
}

function exportToExcel() {
    const data = getReportData();
    const s = [
        ['LAPORAN CLOSING ' + data.branch.toUpperCase()], ['Pelapor', data.reporter], ['Tanggal', data.date], ['Shift', data.shift], [''],
        ['RINGKASAN'], ['Omzet', data.dinein], ['Cash', data.cash], ['QRIS', data.qris], ['Modal Awal', data.modal],
        ['Total Didapat', data.totalIncome], ['Total Keluar', data.totalExpense], ['Laba Kotor', data.grossProfit], ['Selisih', data.totalIncome - data.grossProfit], [''],
        ['ONLINE FOOD'], ['Shopee', data.shopee], ['GoFood', data.gofood], ['GrabFood', data.grab], [''],
        ['PENGELUARAN'], ['Deskripsi', 'Kategori', 'Harga', 'Qty', 'Total']
    ];
    data.expenses.forEach(e => s.push([e.description, e.category, e.price, e.qty, e.price * e.qty]));
    const ws = XLSX.utils.aoa_to_sheet(s); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Closing');
    XLSX.writeFile(wb, `Closing_${data.branch.replace(/\s/g,'_')}_${data.date}.xlsx`);
}

function showMessage(txt) { const box = document.getElementById('msg-box'); box.innerText = txt; box.classList.remove('hidden'); setTimeout(() => box.classList.add('hidden'), 3000); }
