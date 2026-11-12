import { state } from '../state.js';
import { apiRequest } from '../api.js';
import { addNotification, escapeHtml, formatDate, formatDateTime, refreshIcons, showToast } from '../utils.js';
import { navigate } from '../router.js';

export async function renderBillingView(container) {
  const { ok, data: invoices } = await apiRequest('/api/invoices');
  const list = ok && Array.isArray(invoices) ? invoices : [];

  container.innerHTML = `
    <div class="table-card" style="margin-top: 10px;">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Patient Name</th>
              <th>Due Date</th>
              <th>Treatment Plan</th>
              <th>Billed Amount</th>
              <th>Amount Paid</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              list.length === 0
                ? '<tr><td colspan="8" style="text-align:center;">No bills found.</td></tr>'
                : list
                    .map((i) => {
                      const patientName =
                        i.first_name || i.last_name
                          ? `${i.first_name || ''} ${i.last_name || ''}`.trim()
                          : state.user.name;
                      return `
                <tr>
                  <td><strong>INV-10${Number(i.id)}</strong></td>
                  <td>${escapeHtml(patientName)}</td>
                  <td>${escapeHtml(formatDate(i.due_date))}</td>
                  <td>${escapeHtml(i.plan_title || 'General Care')}</td>
                  <td>$${Number(i.total_amount || 0).toFixed(2)}</td>
                  <td>$${Number(i.amount_paid || 0).toFixed(2)}</td>
                  <td><span class="badge ${i.status === 'paid' ? 'success' : i.status === 'unpaid' ? 'danger' : 'warning'}">${escapeHtml(i.status)}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-icon btn-view-inv" data-invoice-id="${Number(i.id)}" title="Collect Payment/View Invoice">
                      <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                  </td>
                </tr>
              `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-view-inv').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-invoice-id');
      window.location.hash = `invoice-${id}`;
      navigate(`invoice-${id}`);
    });
  });

  refreshIcons();
}

export async function renderInvoiceView(container, invoiceId) {
  const { ok, data } = await apiRequest(`/api/invoices/${invoiceId}`);
  if (!ok || !data || !data.invoice) {
    container.innerHTML = '<div class="toast danger">Invoice not found.</div>';
    return;
  }

  const i = data.invoice;
  const totalAmount = Number(i.total_amount || 0);
  const amountPaid = Number(i.amount_paid || 0);
  const balance = Math.max(0, Number((totalAmount - amountPaid).toFixed(2)));
  const canCollect = (state.user.role === 'admin' || state.user.role === 'staff') && balance > 0;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:32px; flex-wrap:wrap;">
      <div class="stat-card" style="flex:2; min-width:320px; display:block; padding:40px; background:#fff; color:#000;">
        <div style="display:flex; justify-content:space-between; margin-bottom:40px;">
          <div>
            <h2 style="font-size:1.8rem; color:#4f46e5;">DentalFlow</h2>
            <p style="font-size:0.85rem; color:#6b7280;">123 Premium Dental Blvd, Suite A<br>Seattle, WA 98101 | (555) 0100</p>
          </div>
          <div style="text-align:right;">
            <h2 style="font-size:1.5rem; font-weight:600;">INVOICE</h2>
            <p style="font-size:0.9rem; font-weight:500;">INV-10${Number(i.id)}</p>
            <p style="font-size:0.8rem; color:#6b7280; margin-top:4px;">Date: ${escapeHtml(formatDate(i.created_at))}<br>Due: ${escapeHtml(formatDate(i.due_date))}</p>
          </div>
        </div>

        <div style="margin-bottom:30px;">
          <h4 style="font-size:0.8rem; color:#9ca3af; text-transform:uppercase; margin-bottom:8px;">Billed To:</h4>
          <p style="font-weight:600; font-size:1.05rem;">${escapeHtml(i.first_name)} ${escapeHtml(i.last_name)}</p>
          <p style="font-size:0.85rem; color:#4b5563;">
            ${escapeHtml(i.phone || '')}<br>
            ${escapeHtml(i.email || '')}<br>
            ${escapeHtml(i.address || '')}
          </p>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb; text-align:left;">
              <th style="padding:12px 0; background:transparent; color:#374151;">Description</th>
              <th style="padding:12px 0; background:transparent; color:#374151; text-align:right;">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:12px 0;">Dental Treatment plan - Completed items: ${escapeHtml(i.plan_title || 'General Care')}</td>
              <td style="padding:12px 0; text-align:right;">$${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="display:flex; justify-content:flex-end;">
          <div style="width:250px; font-size:0.9rem;">
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f3f4f6;">
              <span>Subtotal:</span>
              <span>$${totalAmount.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f3f4f6;">
              <span>Discount:</span>
              <span>$${Number(i.discount || 0).toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; font-weight:600; font-size:1.05rem;">
              <span>Grand Total:</span>
              <span>$${totalAmount.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; color:#10b981; font-weight:500;">
              <span>Total Paid:</span>
              <span>$${amountPaid.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; color:#ef4444; font-weight:600; border-top:2px solid #e5e7eb; margin-top:8px;">
              <span>Balance Due:</span>
              <span>$${balance.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      ${
        canCollect
          ? `
        <div class="stat-card" style="flex:1; min-width:280px; display:block; padding:24px;">
          <h3>Collect Bill Payment</h3>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">Log manual card, cash or insurance payment details below.</p>
          <form id="record-payment-form">
            <div class="form-group">
              <label>Amount to Collect ($)*</label>
              <input type="number" id="pay-amount" required step="0.01" min="0.01" max="${balance}" value="${balance}">
            </div>
            <div class="form-group">
              <label>Payment Method*</label>
              <select id="pay-method" required>
                <option value="card">Credit/Debit Card</option>
                <option value="cash">Cash Payment</option>
                <option value="insurance">Insurance Claim</option>
              </select>
            </div>
            <div class="form-group">
              <label>Transaction Reference ID</label>
              <input type="text" id="pay-ref" placeholder="TX-778899">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Process Payment</button>
          </form>
        </div>
      `
          : ''
      }
    </div>
  `;

  if (canCollect) {
    document.getElementById('record-payment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        amount: parseFloat(document.getElementById('pay-amount').value),
        paymentMethod: document.getElementById('pay-method').value,
        transactionRef: document.getElementById('pay-ref').value,
      };

      const { ok: payOk, data: payData } = await apiRequest(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: payload,
      });

      if (payOk) {
        showToast('Payment processed and balance updated.', 'success');
        addNotification('Payment collected. Invoice status updated.');
        await navigate(`invoice-${invoiceId}`);
      } else {
        showToast((payData && payData.error) || 'Failed to process payment', 'danger');
      }
    });
  }
}

export async function renderPaymentsView(container) {
  container.innerHTML = `
    <div style="background:var(--bg-secondary); padding:24px; border-radius:var(--radius-md); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
      <h3 style="margin-bottom:12px;">Payment Transactions Log</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">History of all recorded transaction payments across clinic invoices.</p>
      
      <div class="table-card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Patient</th>
                <th>Procedure / Plan</th>
                <th>Amount Paid</th>
                <th>Method</th>
                <th>Ref Code</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="payments-table-body">
              <tr><td colspan="7" style="text-align:center;">Loading payments log...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const { ok, data: list } = await apiRequest('/api/payments');
    const tbody = document.getElementById('payments-table-body');
    if (!ok || !Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No payment transactions recorded.</td></tr>';
      return;
    }

    tbody.innerHTML = list
      .map((pay) => {
        const nameText = pay.first_name ? `${pay.first_name} ${pay.last_name}` : 'My Account';
        return `
        <tr>
          <td><strong>TX-10${Number(pay.id)}</strong></td>
          <td>${escapeHtml(nameText)}</td>
          <td>${escapeHtml(pay.plan_title || 'General Clinic Charge')}</td>
          <td style="color:var(--success-color); font-weight:700;">$${Number(pay.amount || 0).toFixed(2)}</td>
          <td><span class="badge primary" style="text-transform:uppercase;">${escapeHtml(pay.payment_method)}</span></td>
          <td><code>${escapeHtml(pay.transaction_ref || 'N/A')}</code></td>
          <td>${escapeHtml(formatDateTime(pay.created_at))}</td>
        </tr>
      `;
      })
      .join('');
    refreshIcons();
  } catch {
    showToast('Failed to load payments history', 'danger');
  }
}

