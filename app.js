// StitchMate v2 - single-user local app with contacts, due date, search/sort, printable receipt
(function(){
  const ORDERS_KEY = 'stitchmate_orders_v2';
  const PROFILES_KEY = 'stitchmate_profiles_v2';

  const SIZE_TEMPLATES = {
    'Blouse': ['Bust (cm)','Waist (cm)','Shoulder (cm)','Blouse length (cm)'],
    'Shirt': ['Chest (cm)','Waist (cm)','Sleeve length (cm)','Shirt length (cm)'],
    'Kurta': ['Chest (cm)','Waist (cm)','Hip (cm)','Kurta length (cm)'],
    'Dress': ['Chest (cm)','Waist (cm)','Hip (cm)','Dress length (cm)'],
    'Pant': ['Waist (cm)','Hip (cm)','Inseam (cm)','Pant length (cm)'],
    'Other': ['Main measurement 1','Main measurement 2']
  };

  // DOM refs
  const recipientName = document.getElementById('recipientName');
  const phoneNumber = document.getElementById('phoneNumber');
  const address = document.getElementById('address');
  const dueDate = document.getElementById('dueDate');
  const numClothes = document.getElementById('numClothes');
  const clothType = document.getElementById('clothType');
  const sizeFields = document.getElementById('sizeFields');
  const totalAmount = document.getElementById('totalAmount');
  const advanceAmount = document.getElementById('advanceAmount');
  const remainingAmount = document.getElementById('remainingAmount');
  const orderDate = document.getElementById('orderDate');
  const saveProfile = document.getElementById('saveProfile');
  const orderForm = document.getElementById('orderForm');
  const historyList = document.getElementById('historyList');
  const filterName = document.getElementById('filterName');
  const showAllBtn = document.getElementById('showAllBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const backupBtn = document.getElementById('backupBtn');
  const clearFormBtn = document.getElementById('clearFormBtn');
  const contrastToggle = document.getElementById('contrastToggle');
  const sortSelect = document.getElementById('sortSelect');

  let orders = load(ORDERS_KEY) || [];
  let profiles = load(PROFILES_KEY) || {};

  renderSizeFields(clothType.value);
  renderHistory();
  updateRemaining();
  orderDate.value = new Date().toISOString().slice(0,10);

  clothType.addEventListener('change', () => renderSizeFields(clothType.value));
  advanceAmount.addEventListener('input', updateRemaining);
  totalAmount.addEventListener('input', updateRemaining);
  recipientName.addEventListener('blur', tryFillProfile);
  orderForm.addEventListener('submit', onSaveOrder);
  filterName.addEventListener('input', renderHistory);
  showAllBtn.addEventListener('click', () => { filterName.value=''; renderHistory(); });
  exportCsvBtn.addEventListener('click', exportCSV);
  backupBtn.addEventListener('click', downloadBackup);
  clearFormBtn.addEventListener('click', clearForm);
  contrastToggle.addEventListener('click', toggleContrast);
  sortSelect.addEventListener('change', renderHistory);

  function load(key){
    try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; }
  }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function renderSizeFields(type, values = {}){
    sizeFields.innerHTML = '';
    const fields = SIZE_TEMPLATES[type] || SIZE_TEMPLATES['Other'];
    fields.forEach((labelText, idx) => {
      const wrapper = document.createElement('label');
      wrapper.innerHTML = labelText + '<input data-size-key="'+labelText+'" placeholder="'+labelText+'" value="'+(values[labelText]||'')+'">';
      sizeFields.appendChild(wrapper);
    });
  }

  function collectSizeValues(){
    const inputs = sizeFields.querySelectorAll('input[data-size-key]');
    const obj = {};
    inputs.forEach(inp => { obj[inp.dataset.sizeKey] = inp.value.trim(); });
    return obj;
  }

  function tryFillProfile(){
    const name = recipientName.value.trim();
    if(!name) return;
    const p = profiles[name];
    if(p && p.sizes){
      clothType.value = p.type || clothType.value;
      phoneNumber.value = p.phone || phoneNumber.value;
      address.value = p.address || address.value;
      renderSizeFields(clothType.value, p.sizes || {});
    }
  }

  function updateRemaining(){
    const total = parseFloat(totalAmount.value) || 0;
    const adv = parseFloat(advanceAmount.value) || 0;
    remainingAmount.value = Math.max(0, +(total - adv).toFixed(2));
  }

  function onSaveOrder(e){
    e.preventDefault();
    const name = recipientName.value.trim();
    if(!name){ alert('Please enter recipient name'); recipientName.focus(); return; }

    const num = parseInt(numClothes.value) || 1;
    const type = clothType.value;
    const sizes = collectSizeValues();
    const total = parseFloat(totalAmount.value) || 0;
    const advance = parseFloat(advanceAmount.value) || 0;
    const remaining = Math.max(0, +(total - advance).toFixed(2));
    const dateVal = orderDate.value || (new Date()).toISOString().slice(0,10);
    const due = dueDate.value || '';
    const phone = phoneNumber.value.trim();
    const addr = address.value.trim();

    const order = {
      id: 'o_'+Date.now(),
      name, phone, addr, num, type, sizes, total, advance, remaining, date: dateVal, due, createdAt: new Date().toISOString()
    };

    orders.unshift(order);
    save(ORDERS_KEY, orders);

    if(saveProfile.checked){
      profiles[name] = { type, sizes, phone, address: addr, updatedAt: new Date().toISOString() };
      save(PROFILES_KEY, profiles);
    }

    renderHistory();
    alert('Order saved');
    clearForm();
  }

  function renderHistory(){
    const filter = filterName.value.trim().toLowerCase();
    historyList.innerHTML = '';
    if(orders.length===0){
      historyList.innerHTML = '<p><small>No orders yet. Add an order above.</small></p>';
      return;
    }

    // apply filter
    let list = orders.filter(o => {
      if(!filter) return true;
      return (o.name||'').toLowerCase().includes(filter) ||
             (o.phone||'').toLowerCase().includes(filter) ||
             (o.addr||'').toLowerCase().includes(filter);
    });

    // sort
    const mode = sortSelect.value || 'date_desc';
    if(mode === 'date_desc') list.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
    if(mode === 'date_asc') list.sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    if(mode === 'balance_desc') list.sort((a,b)=> b.remaining - a.remaining);
    if(mode === 'balance_asc') list.sort((a,b)=> a.remaining - b.remaining);

    list.forEach(order => {
      const div = document.createElement('div');
      div.className = 'order';
      const overdue = order.due && (new Date(order.due) < new Date()) && order.remaining>0;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<strong>${escapeHtml(order.name)}</strong> <small>${order.type} • x${order.num} • ${order.date}</small>
        <div><small>${order.phone ? '📞 '+escapeHtml(order.phone)+' • ' : ''}${order.addr?escapeHtml(order.addr)+' • ':''}${order.due?('Due: '+order.due+' • '):''}Advance: ₹${order.advance} • Remaining: ₹${order.remaining} • Total: ₹${order.total}</small></div>
        <details><summary>Sizes</summary><pre>${formatSizes(order.sizes)}</pre></details>
      `;

      if(overdue){
        const ov = document.createElement('div'); ov.innerHTML = '<small style="color:#c0392b">⚠ Overdue</small>'; meta.appendChild(ov);
      }

      const actions = document.createElement('div');
      actions.className = 'actions';

      const receiptBtn = document.createElement('button'); receiptBtn.textContent='Receipt';
      receiptBtn.addEventListener('click', ()=> openReceipt(order));
      actions.appendChild(receiptBtn);

      const payBtn = document.createElement('button');
      payBtn.textContent = order.remaining>0 ? 'Mark paid' : 'Paid';
      payBtn.disabled = order.remaining===0;
      payBtn.addEventListener('click', () => {
        order.advance = order.total;
        order.remaining = 0;
        save(ORDERS_KEY, orders);
        renderHistory();
      });
      actions.appendChild(payBtn);

      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download';
      downloadBtn.addEventListener('click', () => downloadOrder(order));
      actions.appendChild(downloadBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if(confirm('Delete this order?')) {
          orders = orders.filter(o => o.id !== order.id);
          save(ORDERS_KEY, orders);
          renderHistory();
        }
      });
      actions.appendChild(deleteBtn);

      div.appendChild(meta);
      div.appendChild(actions);
      historyList.appendChild(div);
    });
  }

  function formatSizes(sizes){
    return Object.entries(sizes || {}).map(([k,v]) => k + ': ' + (v||'-')).join('\n');
  }

  function downloadOrder(order){
    const data = JSON.stringify(order, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order_${order.id}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCSV(){
    if(orders.length===0){ alert('No orders to export'); return; }
    const header = ['id','name','phone','address','date','due','type','num','total','advance','remaining','sizes'];
    const rows = orders.map(o => {
      const sizesText = Object.entries(o.sizes||{}).map(([k,v]) => k+':'+(v||'')).join('|');
      return [o.id, o.name, o.phone||'', o.addr||'', o.date||'', o.due||'', o.type, o.num, o.total, o.advance, o.remaining, '"' + sizesText + '"'];
    });
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `stitchmate_orders_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function downloadBackup(){
    const data = { orders, profiles, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stitchmate_backup_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function clearForm(){
    orderForm.reset();
    renderSizeFields(clothType.value);
    updateRemaining();
    orderDate.value = new Date().toISOString().slice(0,10);
  }

  function toggleContrast(){
    const on = document.body.classList.toggle('high-contrast');
    contrastToggle.setAttribute('aria-pressed', String(on));
  }

  function openReceipt(order){
    // Create a printable receipt in a new window
    const receiptHtml = `
      <html><head>
        <title>Receipt - ${escapeHtml(order.name)}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif; padding:20px; color:#111}
          .box{max-width:600px;margin:0 auto;border:1px solid #ddd;padding:16px;border-radius:8px}
          h2{margin:0 0 8px}
          table{width:100%;border-collapse:collapse;margin-top:8px}
          td,th{padding:6px 8px;border-bottom:1px solid #eee;text-align:left}
          .totals{text-align:right;margin-top:12px}
          .muted{color:#666;font-size:13px}
        </style>
      </head><body>
      <div class="box">
        <h2>StitchMate — Receipt</h2>
        <div><strong>${escapeHtml(order.name)}</strong> ${order.phone?('<br>📞 '+escapeHtml(order.phone)):''}${order.addr?('<br>'+escapeHtml(order.addr)):''}</div>
        <div class="muted">Order ID: ${order.id} • Date: ${order.date} ${order.due?(' • Due: '+order.due):''}</div>
        <hr>
        <table>
          <tr><th>Item</th><th>Type</th><th>Qty</th><th>Amount</th></tr>
          <tr><td>Clothing</td><td>${escapeHtml(order.type)}</td><td>${order.num}</td><td>₹${order.total.toFixed(2)}</td></tr>
        </table>
        <div class="totals">
          <div>Advance: ₹${order.advance.toFixed(2)}</div>
          <div><strong>Remaining: ₹${order.remaining.toFixed(2)}</strong></div>
        </div>
        <hr>
        <div class="muted">Sizes:</div>
        <pre>${formatSizes(order.sizes)}</pre>
        <p class="muted">Thank you for your business!</p>
      </div>
      <script>window.onload=function(){window.print();}</script>
      </body></html>
    `;
    const w = window.open('', '_blank', 'noopener');
    w.document.write(receiptHtml);
    w.document.close();
  }

  // small helpers
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

})();
