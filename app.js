// StitchMate v2 - single-user local app with contacts, due date, search/sort, printable receipt, PDF download, additional clothes
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
  const additionalClothesCheck = document.getElementById('additionalClothesCheck');
  const additionalClothesNum = document.getElementById('additionalClothesNum');

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
  additionalClothesCheck.addEventListener('change', () => {
    const show = additionalClothesCheck.checked;
    document.getElementById('additionalClothesNumLabel').style.display = show ? 'block' : 'none';
    if (!show) additionalClothesNum.value = 0;
  });

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
      additionalClothesCheck.checked = p.additional ? p.additional.has : false;
      additionalClothesNum.value = p.additional ? p.additional.count : 0;
      document.getElementById('additionalClothesNumLabel').style.display = additionalClothesCheck.checked ? 'block' : 'none';
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
    const additional = {
      has: additionalClothesCheck.checked,
      count: additionalClothesCheck.checked ? parseInt(additionalClothesNum.value) || 0 : 0
    };

    const order = {
      id: 'o_'+Date.now(),
      name, phone, addr, num, type, sizes, total, advance, remaining, date: dateVal, due, additional, createdAt: new Date().toISOString()
    };

    orders.unshift(order);
    save(ORDERS_KEY, orders);

    if(saveProfile.checked){
      profiles[name] = { type, sizes, phone, address: addr, additional, updatedAt: new Date().toISOString() };
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
      meta.innerHTML = `<strong>${escapeHtml(order.name)}</strong> <small>${order.type} • x${order.num} ${order.additional && order.additional.has ? '+${order.additional.count} additional' : ''} • ${order.date}</small>
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

  async function downloadOrder(order){
    // Reuse the styled HTML from receipt
    const receiptHtml = `
      <div class="box" style="
        max-width:550px; padding:20px; border:2px solid #0b5cff; border-radius:8px; background:#fff; font-family:Arial,sans-serif; color:#111;
      ">
        <h2 style="margin:0 0 12px; text-align:center; color:#0b5cff; border-bottom:2px solid #0b5cff; padding-bottom:8px;">StitchMate — Receipt</h2>
        <div><strong>${escapeHtml(order.name)}</strong><br>
          ${order.phone ? '📞 ' + escapeHtml(order.phone) + '<br>' : ''}
          ${order.addr ? escapeHtml(order.addr) + '<br>' : ''}
        </div>
        <div style="color:#666;font-size:13px;">Order ID: ${order.id} • Date: ${order.date} ${order.due ? '• Due: ' + order.due : ''}</div>
        <hr style="border:1px solid #ddd;">
        <table style="width:100%;border-collapse:collapse;margin:12px 0; border:1px solid #ddd;">
          <tr><th style="padding:10px 12px;border:1px solid #eee; background:#f7f9ff; color:#0b1b2b;">Item</th>
              <th style="padding:10px 12px;border:1px solid #eee; background:#f7f9ff; color:#0b1b2b;">Type</th>
              <th style="padding:10px 12px;border:1px solid #eee; background:#f7f9ff; color:#0b1b2b;">Qty</th>
              <th style="padding:10px 12px;border:1px solid #eee; background:#f7f9ff; color:#0b1b2b;">Amount</th></tr>
          <tr><td style="padding:10px 12px;border:1px solid #eee;">Clothing</td>
              <td style="padding:10px 12px;border:1px solid #eee;">${escapeHtml(order.type)}</td>
              <td style="padding:10px 12px;border:1px solid #eee;">${order.num}</td>
              <td style="padding:10px 12px;border:1px solid #eee;">₹${order.total.toFixed(2)}</td></tr>
          ${order.additional && order.additional.has ? `<tr><td style="padding:10px 12px;border:1px solid #eee;">Additional</td>
              <td style="padding:10px 12px;border:1px solid #eee;">-</td>
              <td style="padding:10px 12px;border:1px solid #eee;">${order.additional.count}</td>
              <td style="padding:10px 12px;border:1px solid #eee;">Included</td></tr>` : ''}
        </table>
        <div style="text-align:right;margin:16px 0; font-weight:bold;">
          <div>Advance: ₹${order.advance.toFixed(2)}</div>
          <div><strong>Remaining: ₹${order.remaining.toFixed(2)}</strong></div>
        </div>
        <hr style="border:1px solid #ddd;">
        <div style="border:1px solid #ddd; padding:10px; margin:10px 0; background:#f9f9f9;">
          <div style="color:#666;font-size:13px;">Measurements:</div>
          <pre style="margin:0; white-space:pre-wrap; font-size:12px;">${formatSizes(order.sizes)}</pre>
        </div>
        ${order.additional && order.additional.has ? `
        <div style="border:1px solid #ddd; padding:10px; margin:10px 0; background:#f9f9f9;">
          <div style="color:#666;font-size:13px;">Additional Clothes: ${order.additional.count}</div>
        </div>` : ''}
        <p style="text-align:center; margin-top:20px; color:#666; font-size:13px;">Thank you for your business!</p>
      </div>
    `;

    // Create temp div, snapshot, and generate PDF
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = receiptHtml;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`receipt_${order.id}.pdf`);
    } catch (e) {
      alert('PDF generation failed—check console or use Print to PDF as fallback.');
      console.error(e);
    } finally {
      document.body.removeChild(tempDiv);
    }
  }

  function exportCSV(){
    if(orders.length===0){ alert('No orders to export'); return; }
    const header = ['id','name','phone','address','date','due','type','num','total','advance','remaining','sizes','additional'];
    const rows = orders.map(o => {
      const sizesText = Object.entries(o.sizes||{}).map(([k,v]) => k+':'+(v||'')).join('|');
      const additionalText = JSON.stringify(o.additional || {has: false, count: 0});
      return [o.id, o.name, o.phone||'', o.addr||'', o.date||'', o.due||'', o.type, o.num, o.total, o.advance, o.remaining, '"' + sizesText + '"', additionalText];
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
    additionalClothesCheck.checked = false;
    document.getElementById('additionalClothesNumLabel').style.display = 'none';
    additionalClothesNum.value = 0;
  }

  function toggleContrast(){
    const on = document.body.classList.toggle('high-contrast');
    contrastToggle.setAttribute('aria-pressed', String(on));
  }

  function openReceipt(order){
    const receiptHtml = `
      <html><head>
        <title>Receipt - ${escapeHtml(order.name)}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif; padding:20px; color:#111; margin:0;}
          .box{max-width:600px;margin:0 auto;border:2px solid #0b5cff;padding:20px;border-radius:8px;background:#fff;}
          h2{margin:0 0 12px; text-align:center; color:#0b5cff; border-bottom:2px solid #0b5cff; padding-bottom:8px;}
          table{width:100%;border-collapse:collapse;margin:12px 0; border:1px solid #ddd;}
          td,th{padding:10px 12px;border:1px solid #eee;text-align:left; font-size:14px;}
          th{background:#f7f9ff; color:#0b1b2b;}
          .totals{text-align:right;margin:16px 0; font-weight:bold;}
          .muted{color:#666;font-size:13px;}
          .print-btn{background:#0b5cff; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; margin:10px 0; display:block; margin:10px auto;}
          .sizes-section{border:1px solid #ddd; padding:10px; margin:10px 0; background:#f9f9f9;}
        </style>
      </head><body>
      <div class="box">
        <h2>StitchMate — Receipt</h2>
        <div><strong>${escapeHtml(order.name)}</strong><br>
          ${order.phone ? '📞 ' + escapeHtml(order.phone) + '<br>' : ''}
          ${order.addr ? escapeHtml(order.addr) + '<br>' : ''}
        </div>
        <div class="muted">Order ID: ${order.id} • Date: ${order.date} ${order.due ? '• Due: ' + order.due : ''}</div>
        <hr style="border:1px solid #ddd;">
        <table>
          <tr><th>Item</th><th>Type</th><th>Qty</th><th>Amount</th></tr>
          <tr><td>Clothing</td><td>${escapeHtml(order.type)}</td><td>${order.num}</td><td>₹${order.total.toFixed(2)}</td></tr>
          ${order.additional && order.additional.has ? `<tr><td>Additional</td><td>-</td><td>${order.additional.count}</td><td>Included</td></tr>` : ''}
        </table>
        <div class="totals">
          <div>Advance: ₹${order.advance.toFixed(2)}</div>
          <div><strong>Remaining: ₹${order.remaining.toFixed(2)}</strong></div>
        </div>
        <hr style="border:1px solid #ddd;">
        <div class="sizes-section">
          <div class="muted">Measurements:</div>
          <pre style="margin:0; white-space:pre-wrap;">${formatSizes(order.sizes)}</pre>
        </div>
        ${order.additional && order.additional.has ? `
        <div class="sizes-section">
          <div class="muted">Additional Clothes: ${order.additional.count}</div>
        </div>` : ''}
        <p class="muted" style="text-align:center; margin-top:20px;">Thank you for your business!</p>
        <button class="print-btn" onclick="window.print();">Print Receipt (or Save as PDF)</button>
      </div>
      </body></html>
    `;
    const w = window.open('', '_blank', 'width=600,height=800,noopener');
    if (w) {
      w.document.write(receiptHtml);
      w.document.close();
      // Fallback: Focus and alert if print fails
      w.onload = () => {
        if (!w.print) alert('Print window opened—tap "Print Receipt" button inside and choose "Save as PDF" for a file.');
      };
    } else {
      alert('Allow popups for the browser to open the receipt window.');
    }
  }

  // small helpers
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

})();
