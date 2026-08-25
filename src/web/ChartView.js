/**
 * Aggregate and chart sheet data: value frequencies and clock histograms.
 */
const ChartView = (function () {
    const TOP_N = 20;
    let freqChart = null;
    let timeChart = null;

    function destroyCharts() {
        if (freqChart) {
            freqChart.destroy();
            freqChart = null;
        }
        if (timeChart) {
            timeChart.destroy();
            timeChart = null;
        }
    }

    function rowPredicate(scope) {
        switch (scope) {
            case "selected":
                return (row) => row.isSelected;
            case "all":
                return null;
            default:
                return (row) => !row.isHidden;
        }
    }

    function countFrequencies(records, field, topN) {
        const counts = {};
        records.forEach((rec) => {
            const raw = rec.flds ? rec.flds[field] : rec[field];
            const key = raw == null || raw === "" ? "(empty)" : String(raw);
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.keys(counts)
            .map((label) => ({ label, count: counts[label] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, topN);
    }

    function pad2(n) {
        return n < 10 ? "0" + n : String(n);
    }

    function bucketClock(records, field, bucket) {
        const counts = {};
        let skipped = 0;
        records.forEach((rec) => {
            const raw = rec.flds ? rec.flds[field] : rec[field];
            const ms = parseUnixMs(raw);
            if (ms == null) {
                skipped++;
                return;
            }
            const d = new Date(ms);
            let key;
            if (bucket === "day") {
                key = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
            } else {
                key = pad2(d.getHours()) + ":00";
            }
            counts[key] = (counts[key] || 0) + 1;
        });

        let labels;
        if (bucket === "hour") {
            labels = [];
            for (let h = 0; h < 24; h++) labels.push(pad2(h) + ":00");
        } else {
            labels = Object.keys(counts).sort();
        }
        return {
            labels,
            values: labels.map((l) => counts[l] || 0),
            skipped,
        };
    }

    function palette(n) {
        const colors = [
            "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
            "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ab",
        ];
        const out = [];
        for (let i = 0; i < n; i++) out.push(colors[i % colors.length]);
        return out;
    }

    function renderCharts($el) {
        destroyCharts();
        const sheet = sheetManager.get_active();
        if (!sheet) return;

        const categoryField = $el.find("[name=category]").val();
        const chartType = $el.find("[name=chartType]").val() || "bar";
        const clockField = $el.find("[name=clock]").val();
        const bucket = $el.find("[name=bucket]").val() || "hour";
        const scope = $el.find("[name=records]").val() || "visible";
        const pred = rowPredicate(scope);
        const records = sheet.export(pred);

        $el.find(".chart-meta").text(records.length + " row(s)");

        const freqCanvas = $el.find("canvas.freq-chart")[0];
        const timeCanvas = $el.find("canvas.time-chart")[0];
        const $timeWrap = $el.find(".time-chart-wrap");

        if (categoryField && freqCanvas) {
            const freq = countFrequencies(records, categoryField, TOP_N);
            freqChart = new Chart(freqCanvas, {
                type: chartType === "pie" ? "pie" : "bar",
                data: {
                    labels: freq.map((f) => f.label),
                    datasets: [{
                        label: "Count",
                        data: freq.map((f) => f.count),
                        backgroundColor: palette(freq.length),
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: "Top values — " + categoryField },
                        legend: { display: chartType === "pie" },
                    },
                    ...(chartType === "pie" ? {} : {
                        scales: {
                            x: { ticks: { autoSkip: true, maxRotation: 45, minRotation: 0 } },
                            y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                    }),
                },
            });
        }

        if (clockField && timeCanvas) {
            $timeWrap.show();
            const hist = bucketClock(records, clockField, bucket);
            const title = bucket === "day"
                ? "Events by day — " + clockField
                : "Events by hour of day — " + clockField;
            timeChart = new Chart(timeCanvas, {
                type: "bar",
                data: {
                    labels: hist.labels,
                    datasets: [{
                        label: "Count",
                        data: hist.values,
                        backgroundColor: "#4e79a7",
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: title },
                        legend: { display: false },
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } },
                    },
                },
            });
            if (hist.skipped) {
                $el.find(".chart-meta").append(" · " + hist.skipped + " unparseable clock value(s)");
            }
        } else {
            $timeWrap.hide();
        }
    }

    function chart_modal() {
        const sheet = sheetManager.get_active();
        if (!sheet || !sheet.fields || !sheet.fields.length) {
            alert_modal("No data in the active sheet to chart.");
            return;
        }

        const $el = $("#chartDialog").clone().removeAttr("id");
        const $cat = $el.find("select[name=category]");
        const $clock = $el.find("select[name=clock]");
        $clock.append($("<option>").val("").text("(none)"));
        sheet.fields.forEach((field) => {
            $("<option>").val(field).text(field).appendTo($cat);
            $("<option>").val(field).text(field).appendTo($clock);
        });

        // Prefer common Zabbix clock field names as defaults
        const clockGuess = sheet.fields.find((f) =>
            /^(clock|lastchange|r_clock|ns)$/i.test(f) || /clock|time|date/i.test(f)
        );
        if (clockGuess) $clock.val(clockGuess);

        const nameGuess = sheet.fields.find((f) =>
            /^(name|description|problem|eventid|severity)$/i.test(f)
        );
        if (nameGuess) $cat.val(nameGuess);

        dragable_modal({
            title: "Chart data",
            body: $el,
            attrs: { style: "width: 920px; height: 640px;" },
            afterCreate: (modal) => {
                const $form = modal.find(".card-body").children().first();
                const redraw = () => renderCharts($form);
                $form.find("select").on("change", redraw);
                const closeBtn = modal.find(".card-header .fa-times-rectangle").parent();
                closeBtn.on("click", destroyCharts);
                redraw();
            },
            buttons: [
                {
                    text: "Refresh",
                    class: "primary",
                    action: (modal) => {
                        renderCharts(modal.find(".card-body").children().first());
                    },
                },
                {
                    text: "Close",
                    class: "secondary",
                    action: (modal) => {
                        destroyCharts();
                        modal.hide().remove();
                    },
                },
            ],
        });
    }

    return {
        chart_modal,
        destroyCharts,
        countFrequencies,
        bucketClock,
    };
})();

function chart_modal() {
    ChartView.chart_modal();
}
