import { apiJson, apiRequest } from '../api.js';
import { escapeHtml, refreshIcons, formatDateTime, showToast, createModal } from '../utils.js';

export async function renderStockView(container) {
  let items = [];
  try {
    items = await apiJson('/api/stock');
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading inventory.')}</div>`;
    return;
  }

  const lowStock = items.filter((i) => i.quantity <= i.reorder_level);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Clinic Inventory &amp; Medical Supplies</h2>
        <p class="page-subtitle">Monitor consumables, restorative materials, and low-stock reorder alerts.</p>
      </div>
      <button class="btn btn-primary" id="btn-add-stock"><i data-lucide="plus"></i> Add Supply Item</button>
    </div>

    ${
      lowStock.length > 0
        ? `
        <div class="card mb-6" style="background: var(--warning-bg); border-color: #fde68a;">
          <div class="card-body flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i data-lucide="alert-triangle" class="text-warning"></i>
              <div>
                <div class="font-bold text-warning">Low Stock Alert (${lowStock.length} Items)</div>
                <div class="text-sm" style="color: #92400e;">${lowStock.map((i) => escapeHtml(i.item_name)).join(', ')} require replenishment.</div>
              </div>
            </div>
          </div>
        </div>
      `
        : ''
    }

    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Reorder Level</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              items.length
                ? items
                    .map((item) => {
                      const isLow = item.quantity <= item.reorder_level;
                      return `
                        <tr>
                          <td class="font-bold">${escapeHtml(item.item_name)}</td>
                          <td><span class="badge badge-info">${escapeHtml(item.category || 'Consumables')}</span></td>
                          <td class="font-bold">${Number(item.quantity)} ${escapeHtml(item.unit || 'pcs')}</td>
                          <td>${Number(item.reorder_level)} ${escapeHtml(item.unit || 'pcs')}</td>
                          <td><span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">${isLow ? 'Low Stock' : 'Optimal'}</span></td>
                          <td class="text-xs text-muted">${escapeHtml(formatDateTime(item.last_updated))}</td>
                          <td>
                            <div class="flex gap-2">
                              <button class="btn btn-sm btn-secondary" data-edit-stock="${Number(item.id)}"><i data-lucide="edit-2"></i></button>
                              <button class="btn btn-sm btn-danger" data-del-stock="${Number(item.id)}"><i data-lucide="trash-2"></i></button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')
                : '<tr><td colspan="7" class="text-center text-muted" style="padding:30px;">No inventory items found.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  refreshIcons();

  document.getElementById('btn-add-stock').addEventListener('click', () => {
    openStockModal(null, () => renderStockView(container));
  });

  container.querySelectorAll('[data-edit-stock]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = items.find((entry) => Number(entry.id) === Number(btn.dataset.editStock));
      if (item) {
        openStockModal(item, () => renderStockView(container));
      }
    });
  });

  container.querySelectorAll('[data-del-stock]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.delStock);
      if (!confirm('Remove this supply item from inventory?')) return;
      const { ok, data } = await apiRequest(`/api/stock/${id}`, { method: 'DELETE' });
      if (ok) {
        showToast('Item removed.');
        await renderStockView(container);
      } else {
        showToast((data && data.message) || 'Failed to delete item.', 'error');
      }
    });
  });
}

function openStockModal(existing = null, onDone) {
  const isEdit = Boolean(existing);
  const modal = createModal(`
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title">${isEdit ? 'Adjust Inventory Stock' : 'Add New Supply Item'}</div>
        <button type="button" class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
      </div>
      <form id="stock-form">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Item Name *</label>
              <input type="text" id="st-name" value="${escapeHtml(existing ? existing.item_name : '')}" required>
            </div>
            <div class="form-group">
              <label>Category</label>
              <select id="st-cat">
                <option value="PPE" ${existing && existing.category === 'PPE' ? 'selected' : ''}>PPE</option>
                <option value="Restorative" ${existing && existing.category === 'Restorative' ? 'selected' : ''}>Restorative</option>
                <option value="Anesthetics" ${existing && existing.category === 'Anesthetics' ? 'selected' : ''}>Anesthetics</option>
                <option value="Consumables" ${!existing || existing.category === 'Consumables' ? 'selected' : ''}>Consumables</option>
                <option value="Instruments" ${existing && existing.category === 'Instruments' ? 'selected' : ''}>Instruments</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Current Quantity *</label>
              <input type="number" min="0" id="st-qty" value="${existing ? Number(existing.quantity) : 0}" required>
            </div>
            <div class="form-group">
              <label>Unit (e.g., boxes, vials)</label>
              <input type="text" id="st-unit" value="${escapeHtml(existing ? existing.unit || 'pcs' : 'pcs')}">
            </div>
          </div>
          <div class="form-group">
            <label>Minimum Reorder Alert Level</label>
            <input type="number" min="0" id="st-reorder" value="${existing ? Number(existing.reorder_level) : 10}">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update Stock' : 'Save Item'}</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      itemName: document.getElementById('st-name').value,
      category: document.getElementById('st-cat').value,
      quantity: parseInt(document.getElementById('st-qty').value, 10),
      unit: document.getElementById('st-unit').value,
      reorderLevel: parseInt(document.getElementById('st-reorder').value, 10),
    };

    const { ok, data } = await apiRequest(isEdit ? `/api/stock/${existing.id}` : '/api/stock', {
      method: isEdit ? 'PUT' : 'POST',
      body: payload,
    });

    if (ok) {
      showToast(isEdit ? 'Stock updated.' : 'Item added to inventory.');
      modal.remove();
      await onDone();
    } else {
      showToast((data && data.message) || 'Failed to save inventory item.', 'error');
    }
  });
}

