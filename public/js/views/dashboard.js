import { apiJson } from '../api.js';

export async function renderDashboardView(container) {
  const stats = await apiJson('/api/dashboard/stats');

  const monthlyEarnings = Array.isArray(stats?.monthlyEarnings) ? stats.monthlyEarnings : [];
  const treatmentsPopularity = Array.isArray(stats?.treatmentsPopularity) ? stats.treatmentsPopularity : [];

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-info">
          <p>Total Patients</p>
          <h3>${Number(stats?.patientsCount || 0)}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="users"></i></div>
      </div>
      <div class="stat-card success">
        <div class="stat-info">
          <p>Revenue (Generated)</p>
          <h3>$${Number(stats?.revenue || 0).toLocaleString()}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="dollar-sign"></i></div>
      </div>
      <div class="stat-card primary">
        <div class="stat-info">
          <p>Collected Payments</p>
          <h3>$${Number(stats?.collected || 0).toLocaleString()}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="wallet"></i></div>
      </div>
      <div class="stat-card danger">
        <div class="stat-info">
          <p>Outstanding Balances</p>
          <h3>$${Number(stats?.outstanding || 0).toLocaleString()}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="alert-circle"></i></div>
      </div>
    </div>

    <div class="dashboard-charts">
      <div class="chart-card">
        <h3>Revenue Distribution (Last 6 Months)</h3>
        <div class="chart-container">
          <canvas id="revenue-chart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Treatment Popularity</h3>
        <div class="chart-container">
          <canvas id="popularity-chart"></canvas>
        </div>
      </div>
    </div>
  `;

  if (typeof window.Chart === 'function') {
    const ctxRev = document.getElementById('revenue-chart').getContext('2d');
    new window.Chart(ctxRev, {
      type: 'line',
      data: {
        labels: monthlyEarnings.length > 0 ? monthlyEarnings.map((m) => String(m.month || '')) : ['Current Month'],
        datasets: [
          {
            label: 'Monthly Payments Collected ($)',
            data: monthlyEarnings.length > 0 ? monthlyEarnings.map((m) => Number(m.total || 0)) : [0],
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
      },
    });

    const ctxPop = document.getElementById('popularity-chart').getContext('2d');
    new window.Chart(ctxPop, {
      type: 'doughnut',
      data: {
        labels: treatmentsPopularity.length > 0 ? treatmentsPopularity.map((t) => String(t.name || '')) : ['No Data'],
        datasets: [
          {
            data: treatmentsPopularity.length > 0 ? treatmentsPopularity.map((t) => Number(t.count || 0)) : [0],
            backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }
}

