import { apiJson } from '../api.js';
import { escapeHtml, refreshIcons, showToast } from '../utils.js';

export async function renderReportsView(container) {
  let stats;
  try {
    stats = await apiJson('/api/dashboard/stats');
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading reports.')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Clinic Reports &amp; Financial Statements</h2>
        <p class="page-subtitle">Monthly revenue collection, treatment utilization, and exportable statements.</p>
      </div>
      <button class="btn btn-primary" id="btn-export-report"><i data-lucide="download"></i> Export CSV Summary</button>
    </div>

    <div class="grid-3 mb-6">
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">Total Billed Revenue</div>
          <div class="stat-value">$${Number(stats.revenue || 0).toFixed(2)}</div>
        </div>
        <div class="stat-icon blue"><i data-lucide="dollar-sign"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">Collected Payments</div>
          <div class="stat-value">$${Number(stats.collected || 0).toFixed(2)}</div>
        </div>
        <div class="stat-icon teal"><i data-lucide="check-circle"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">Outstanding Receivables</div>
          <div class="stat-value">$${Number(stats.outstanding || 0).toFixed(2)}</div>
        </div>
        <div class="stat-icon amber"><i data-lucide="clock"></i></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card p-6">
        <h4 class="card-title mb-4">Monthly Payment Collection</h4>
        <div style="height: 260px; position: relative;">
          <canvas id="reports-earnings-chart"></canvas>
        </div>
      </div>

      <div class="card p-6">
        <h4 class="card-title mb-4">Top Dental Procedures</h4>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Procedure</th>
                <th>Utilization Count</th>
              </tr>
            </thead>
            <tbody>
              ${
                (stats.treatmentsPopularity || []).length
                  ? stats.treatmentsPopularity
                      .map(
                        (item) => `
                        <tr>
                          <td class="font-bold">${escapeHtml(item.name)}</td>
                          <td><span class="badge badge-info">${Number(item.count)}</span></td>
                        </tr>
                      `
                      )
                      .join('')
                  : '<tr><td colspan="2" class="text-center text-muted">No treatment utilization recorded.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  refreshIcons();

  if (typeof window.Chart !== 'undefined') {
    const canvas = document.getElementById('reports-earnings-chart');
    if (canvas) {
      const labels = (stats.monthlyEarnings || []).map((m) => m.month);
      const values = (stats.monthlyEarnings || []).map((m) => Number(m.total || 0));
      new window.Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['No Data'],
          datasets: [
            {
              label: 'Collected ($)',
              data: values.length ? values : [0],
              backgroundColor: 'rgba(13, 148, 136, 0.7)',
              borderColor: '#0d9488',
              borderWidth: 1,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }
  }

  document.getElementById('btn-export-report').addEventListener('click', () => {
    const rows = [
      ['Metric', 'Value'],
      ['Scheduled Appointments', String(stats.appointmentsCount || 0)],
      ['Total Patients', String(stats.patientsCount || 0)],
      ['Total Revenue', Number(stats.revenue || 0).toFixed(2)],
      ['Collected Revenue', Number(stats.collected || 0).toFixed(2)],
      ['Outstanding Balance', Number(stats.outstanding || 0).toFixed(2)],
    ];
    const csvContent = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinic-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Clinic report exported to CSV.');
  });
}

