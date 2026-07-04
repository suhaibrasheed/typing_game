let chartsInstances = {};

function renderStatsCharts(attempts) {
    const ctx = document.getElementById('stats-wpm-chart');
    if (!ctx) return;

    const validAttempts = [...attempts].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const container = document.getElementById('stats-chart-placeholder');

    if (validAttempts.length === 0) {
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12 text-secondary">
                    <p class="text-lg font-bold mb-1">No historical logs found</p>
                    <p class="text-xs">Complete a practice level to visualize your progression speed curve!</p>
                </div>
            `;
        }
        return;
    }

    if (container) {
        container.innerHTML = '<canvas id="stats-wpm-chart" class="w-full h-64"></canvas>';
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = validAttempts.map(r => {
        const d = new Date(r.timestamp || Date.now());
        return `${months[d.getMonth()]} ${d.getDate()}`;
    });
    const wpmData = validAttempts.map(r => r.wpm);
    const accData = validAttempts.map(r => r.accuracy);

    // Get current theme styling colors
    const css = getComputedStyle(document.body);
    const chartTextColor = css.getPropertyValue('--chart-text-color') || '#94a3b8';
    const accentColor = css.getPropertyValue('--accent-primary') || '#818cf8';
    const gridColor = css.getPropertyValue('--border-color') || '#334155';

    if (chartsInstances.wpmChart) {
        chartsInstances.wpmChart.destroy();
    }

    const canvas = document.getElementById('stats-wpm-chart');
    if (!canvas) return;

    chartsInstances.wpmChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Speed (WPM)',
                    data: wpmData,
                    borderColor: accentColor,
                    backgroundColor: accentColor.trim() + '20', // transparent fill
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: accentColor,
                    pointRadius: 4
                },
                {
                    label: 'Accuracy (%)',
                    data: accData,
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: chartTextColor,
                        font: { family: 'Inter', weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            if (!context || !context[0]) return '';
                            const index = context[0].dataIndex;
                            const attempt = validAttempts[index];
                            if (!attempt) return '';
                            const d = new Date(attempt.timestamp || Date.now());
                            const hours = d.getHours();
                            const minutes = d.getMinutes().toString().padStart(2, '0');
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            const formattedHour = hours % 12 || 12;
                            return `${months[d.getMonth()]} ${d.getDate()} @ ${formattedHour}:${minutes} ${ampm}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: { display: true, text: 'Words Per Minute (WPM)', color: chartTextColor },
                    ticks: { color: chartTextColor },
                    grid: { color: gridColor }
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 50,
                    max: 100,
                    title: { display: true, text: 'Accuracy (%)', color: chartTextColor },
                    ticks: { color: chartTextColor },
                    grid: { drawOnChartArea: false } // don't draw secondary grids
                },
                x: {
                    ticks: { color: chartTextColor },
                    grid: { color: gridColor }
                }
            }
        }
    });

    renderRunsTable(attempts);
}

function renderRunsTable(attempts) {
    const tableBody = document.getElementById('stats-table-body');
    if (!tableBody) return;

    const sortedAttempts = [...attempts].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);

    tableBody.innerHTML = sortedAttempts.map(r => {
        const dateStr = new Date(r.timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const curriculumName = r.curriculum === 'protyper' ? 'School' : 'UPSC';
        return `
            <tr class="border-b border-color hover:bg-secondary/40 transition">
                <td class="px-4 py-3 text-xs text-secondary">${dateStr}</td>
                <td class="px-4 py-3 text-xs font-bold">${curriculumName} - Lvl ${r.levelId + 1}</td>
                <td class="px-4 py-3 text-xs text-right font-extrabold text-[var(--accent-primary)]">${r.wpm} WPM</td>
                <td class="px-4 py-3 text-xs text-right font-extrabold ${r.accuracy >= 95 ? 'text-green-500' : 'text-amber-500'}">${r.accuracy}%</td>
            </tr>
        `;
    }).join('');
}

window.StatsViewUI = {
    renderStatsCharts
};
