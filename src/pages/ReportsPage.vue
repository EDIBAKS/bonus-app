<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md" flat>
      <div class="q-pa-md">
        <q-input v-model="startDate" label="Start Date" type="date" filled dense class="q-mb-md" />
        <q-input v-model="endDate" label="End Date" type="date" filled dense class="q-mb-md" />

        <q-select
          v-model="reportType"
          :options="reportOptions"
          label="Report Type"
          filled
          dense
          class="q-mb-md"
          emit-value
          map-options
        />

        <q-btn label="Filter" color="primary" @click="fetchData" class="q-mt-md full-width" />
      </div>

      <q-card class="q-mt-md">
     
        <q-item-label header class="row items-center justify-between">
          <div>
            <span class="text-lg text-bold">{{ baseTitle }}</span> 
            <span v-if="start && end"> ({{ start }} - {{ end }})</span>
          </div>
        </q-item-label>

        <template v-if="reportType === 'daily'">
          
          <div v-if="pivotBonusData && Object.keys(pivotBonusData).length > 0">
            <div class="">Bonus Report</div>
            <q-col cols="6" class="q-gutter-sm flex justify-end items-center">
  <q-btn flat dense round icon="print" @click="printReport" color="primary">
    <q-tooltip>Print Report</q-tooltip>
  </q-btn>

  <q-btn flat dense round icon="picture_as_pdf" @click="exportToPDF" color="red">
    <q-tooltip>Export to PDF</q-tooltip>
  </q-btn>
</q-col>

            <BonusPivotTable :pivotData="bonusStore.pivotBonusData" :dpcNames="bonusStore.dpcNames"/>
          <!-- Total Row -->
    <!-- Total Row -->
    
  </div>
      <div v-else>
            <p>No data available for the selected date range.</p>
          </div>
        </template>
        <template v-if="reportType === 'summary'">
          <q-row class="items-center justify-between q-mb-md">
    <!-- Left: Currency Selection -->
    <q-col cols="6" class="q-gutter-sm">
      <q-radio v-model="currencyType" label="USD" val="USD" color="primary" />
      <q-radio v-model="currencyType" label="Local Currency" val="LC" color="primary" />
    </q-col>

    <!-- Right: Print & Export Buttons -->
    <q-col cols="6" class="q-gutter-sm text-right">
      <q-btn flat dense round icon="print" @click="printReport" color="primary">
        <q-tooltip>Print Report</q-tooltip>
      </q-btn>
      
      <q-btn flat dense round icon="picture_as_pdf" @click="exportToPDF" color="red">
        <q-tooltip>Export to PDF</q-tooltip>
      </q-btn>
    </q-col>
  </q-row>
  <table class="q-mt-md styled-table">
    <thead>
      <tr>
        <th>DPC Name</th>
        <th>Total Paid Bonus</th>
        <th>Total Unpaid Bonus</th>
        <th>Total Bonus</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(bonus, index) in bonusStore.bonusData" :key="index" :class="{'hover-row': true, 'inverted-row': index % 2 === 0}">
        <td>{{ bonus.dpcname }}</td>
        <td>{{ convertCurrency(bonus.totalpaidbonus || 0) }}</td>
        <td>{{ convertCurrency(bonus.totalunpaidbonus || 0) }}</td>
        <td>{{ convertCurrency(bonus.totalbonus || 0) }}</td>
      </tr>
     <tr>
      <td><strong>Total</strong></td>
      <td><strong>{{ convertCurrency(totalPaidBonus) }}</strong></td>
      <td><strong>{{ convertCurrency(totalUnpaidBonus) }}</strong></td>
      <td><strong>{{ convertCurrency(totalBonus) }}</strong></td>
     </tr>
     
    </tbody>
  </table>
        </template>

      </q-card>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted,watchEffect } from 'vue';
import { useBonusStore } from 'src/stores/bonusStore';
import { useStoreAuth } from 'src/stores/storeAuth';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import BonusPivotTable from 'src/components/BonusPivotTable.vue';
import { useCurrency } from 'src/composables/useCurrency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const startDate = ref('');
const endDate = ref('');
const reportType = ref('daily');
const bonusStore = useBonusStore();
const storeAuth = useStoreAuth(); // Get user info
const { currencyType, convertCurrency } = useCurrency(); 
const totalPerDpc = ref({});
const reportOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Summary', value: 'summary' }
];

// ✅ Use computed property to access the data from Pinia store
const pivotBonusData = computed(() => bonusStore.pivotBonusData);

// Fetch user department
const userDepartment = computed(() => storeAuth.user?.department || '');

// Fetch DPCs based on the first available row in pivotBonusData
const dpcNames = computed(() => {
  if (!pivotBonusData.value || Object.keys(pivotBonusData.value).length === 0) {
    return [];
  }

  const firstRow = Object.values(pivotBonusData.value)[0]; // Get first row data
  if (!firstRow) {
    return [];
  }

  return Object.keys(firstRow).map(dpc => dpc || 'Unknown'); // Ensure no null/undefined values
});
// Generate all dates in range
const allDates = computed(() => {
  if (!startDate.value || !endDate.value) return [];

  return eachDayOfInterval({
    start: parseISO(startDate.value),
    end: parseISO(endDate.value),
  }).map(date => format(date, 'yyyy-MM-dd')); // Format to match DB date
})
// Prepare table rows with all dates & DPC names
const tableRows = computed(() => {
  const pivotData = bonusStore.pivotBonusData || {};
  console.log("Computed pivotData:", pivotData); // ✅ Debugging

  return allDates.value.map(date => {
    const row = { payment_date: date };
    dpcNames.value.forEach(dpc => {
      row[dpc] = pivotData[date]?.[dpc] || 0;
    });
    return row;
  });
});

// Print Report Function
const printReport = () => {
  window.print();
};


// Export to PDF Function
const exportToPDF1 = () => {
  const doc = new jsPDF();
  doc.text("Bonus Report", 14, 10);

  // Extract table data
  const tableData = [];
  document.querySelectorAll("tbody tr").forEach((row) => {
    const rowData = [];
    row.querySelectorAll("td").forEach((cell) => {
      rowData.push(cell.innerText);
    });
    tableData.push(rowData);
  });

  autoTable(doc, {
    head: [["DPC Name", "Total Paid Bonus", "Total Unpaid Bonus", "Total Bonus"]],
    body: tableData,
    startY: 20,
  });

  doc.save("bonus_report.pdf");
};

// Export to PDF Function with Title
const exportToPDF2 = () => {
  const doc = new jsPDF();

  // Format the title with date range and user
  const title = `Bonus Summary (${startDate.value} - ${endDate.value})`;
  const generatedBy = `Generated by: ${storeAuth.userDetails.username}`;

  doc.setFontSize(14);
  doc.text(title, 14, 10);
  doc.setFontSize(10);
  doc.text(generatedBy, 14, 16);

  // Extract table data
  const tableData = [];
  document.querySelectorAll("tbody tr").forEach((row) => {
    const rowData = [];
    row.querySelectorAll("td").forEach((cell) => {
      rowData.push(cell.innerText);
    });
    tableData.push(rowData);
  });

  autoTable(doc, {
    head: [["DPC Name", "Total Paid Bonus", "Total Unpaid Bonus", "Total Bonus"]],
    body: tableData,
    startY: 20,
  });

  doc.save("bonus_summary.pdf");
};


const exportToPDF3 = () => {
  const doc = new jsPDF();
  const title = `Bonus Summary (${startDate.value} - ${endDate.value})`;
  const generatedBy = `Generated by: ${storeAuth.userDetails.username}`;
  
  doc.setFontSize(14);
  doc.text(title, 14, 10);
  doc.setFontSize(10);
  doc.text(generatedBy, 14, 16);

  let tableData = [];
  let tableHeaders = [];
  let tableSelector = "";

  if (reportType.value === "summary") {
    // First Report (Bonus Summary)
    tableSelector = "tbody tr";
    tableHeaders = ["DPC Name", "Total Paid Bonus", "Total Unpaid Bonus", "Total Bonus"];

    document.querySelectorAll(tableSelector).forEach((row) => {
      const rowData = [];
      row.querySelectorAll("td").forEach((cell) => {
        rowData.push(cell.innerText);
      });
      tableData.push(rowData);
    });

  } else if (reportType.value === "daily") {
    // Second Report (Bonus Report - Pivot Table)
    tableSelector = ".styled-table tbody tr";
    tableHeaders = ["Date", ...dpcNames.value];

    document.querySelectorAll(tableSelector).forEach((row) => {
      const rowData = [];
      row.querySelectorAll("td").forEach((cell) => {
        rowData.push(cell.innerText);
      });
      tableData.push(rowData);
    });
  }

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 20,
  });

  doc.save(`${reportType.value}_bonus_report.pdf`);
};

const exportToPDF4 = () => {
  const isDailyReport = reportType.value === "daily";
  const doc = new jsPDF({
    orientation: isDailyReport ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set the report title
  const title = isDailyReport ? "Daily Payments" : `Bonus Summary (${startDate.value} - ${endDate.value})`;
  const generatedBy = `Generated by: ${storeAuth.userDetails.username}`;

  doc.setFontSize(14);
  doc.text(title, 14, 10);
  doc.setFontSize(10);
  doc.text(generatedBy, 14, 16);

  let tableHeaders = [];
  let tableData = [];

  if (isDailyReport) {
    // **Extract data from BonusPivotTable component (Vue props)**
    if (!bonusStore.pivotBonusData || Object.keys(bonusStore.pivotBonusData).length === 0) {
      console.warn("No data available for Daily Payments report.");
      return;
    }

    tableHeaders = ["Date", ...bonusStore.dpcNames];

    // Convert Vue store data into table format
    tableData = Object.entries(bonusStore.pivotBonusData).map(([date, values]) => {
      return [date, ...bonusStore.dpcNames.map(dpc => convertCurrency(values[dpc] || 0))];
    });

    // Add the total row at the bottom
    const totalRow = ["Total", ...bonusStore.dpcNames.map(dpc => convertCurrency(totalPerDpc[dpc] || 0))];
    tableData.push(totalRow);
  } else {
    // **Bonus Summary Report**
    tableHeaders = ["DPC Name", "Total Paid Bonus", "Total Unpaid Bonus", "Total Bonus"];

    document.querySelectorAll("tbody tr").forEach((row) => {
      const rowData = [];
      row.querySelectorAll("td").forEach((cell) => {
        rowData.push(cell.innerText.trim());
      });
      if (rowData.length === tableHeaders.length) {
        tableData.push(rowData);
      }
    });
  }

  // **Generate the PDF table**
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 25,
    theme: "grid",
    styles: { fontSize: 8 },
    margin: { top: 30 },
    columnStyles: { 0: { cellWidth: "auto" } },
  });

  // **Save the file with correct naming**
  doc.save(`${isDailyReport ? "daily_payments" : "bonus_summary"}_report.pdf`);
};

const exportToPDF = () => {
  const isDailyReport = reportType.value === "daily";
  const doc = new jsPDF({
    orientation: isDailyReport ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set the report title
  const dateRangeText = `From:${startDate.value} To: ${endDate.value}`;
  const title = isDailyReport ? `Daily Payments ${dateRangeText}` : `Bonus Summary ${dateRangeText}`;
  const generatedBy = `Generated by: ${storeAuth.userDetails.username}`;

  doc.setFontSize(14);
  doc.text(title, 14, 10);
  doc.setFontSize(10);
  doc.text(generatedBy, 14, 16);

  let tableHeaders = [];
  let tableData = [];

  if (isDailyReport) {
    // **Extract data from BonusPivotTable component (Vue store)**
    if (!bonusStore.pivotBonusData || Object.keys(bonusStore.pivotBonusData).length === 0) {
      console.warn("No data available for Daily Payments report.");
      return;
    }

    tableHeaders = ["Date", ...bonusStore.dpcNames];

    // Convert Vue store data into table format
    tableData = Object.entries(bonusStore.pivotBonusData).map(([date, values]) => {
      return [date, ...bonusStore.dpcNames.map(dpc => convertCurrency(values[dpc] || 0))];
    });

    // **Fix: Calculate total correctly**
    const totalPerDpc = bonusStore.dpcNames.reduce((totals, dpc) => {
      totals[dpc] = Object.values(bonusStore.pivotBonusData).reduce((sum, values) => sum + (values[dpc] || 0), 0);
      return totals;
    }, {});

    // **Add the total row at the bottom**
    const totalRow = ["Total", ...bonusStore.dpcNames.map(dpc => convertCurrency(totalPerDpc[dpc] || 0))];
    tableData.push(totalRow);
  } else {
    // **Bonus Summary Report**
    tableHeaders = ["DPC Name", "Total Paid Bonus", "Total Unpaid Bonus", "Total Bonus"];

    document.querySelectorAll("tbody tr").forEach((row) => {
      const rowData = [];
      row.querySelectorAll("td").forEach((cell) => {
        rowData.push(cell.innerText.trim());
      });
      if (rowData.length === tableHeaders.length) {
        tableData.push(rowData);
      }
    });
  }

  // **Generate the PDF table**
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 25,
    theme: "grid",
    styles: { fontSize: 8 },
    margin: { top: 30 },
    columnStyles: { 0: { cellWidth: "auto" } },
  });

  // **Save the file with correct naming**
  doc.save(`${isDailyReport ? "daily_payments" : "bonus_summary"}_report.pdf`);
};



const fetchData = async () => {
  if (!startDate.value || !endDate.value) {
    console.log("Please select a valid date range.");
    return;
  }

  if (!reportType.value) {
    console.log("Please select a report type.");
    return;
  }

  if (reportType.value === 'summary') {
    //await bonusStore.fetchBonusData(startDate.value, endDate.value);
    await bonusStore.fetchBonusSummary(startDate.value, endDate.value);
  } else if (reportType.value === 'daily') {
    await bonusStore.fetchBonusPivotTable(startDate.value, endDate.value);
  } else {
    console.log("Please select a valid report type.");
  }
};

const totalPaidBonus = computed(() =>
  bonusStore.bonusData.reduce((sum, bonus) => sum + (bonus.totalpaidbonus || 0), 0)
);

const totalUnpaidBonus = computed(() =>
  bonusStore.bonusData.reduce((sum, bonus) => sum + (bonus.totalunpaidbonus || 0), 0)
);

const totalBonus = computed(() =>
  bonusStore.bonusData.reduce((sum, bonus) => sum + (bonus.totalbonus || 0), 0)
);


// Fetch data when report type changes or user selects date
const fetchData1 = async () => {
  if (!startDate.value || !endDate.value) {
    console.log("Please select a valid date range.");
    return;
  }
  bonusStore.fetchBonusPivotTable(startDate.value, endDate.value);
};

watchEffect(() => {
  console.log("Pivot Data Updated:", bonusStore.pivotBonusData);
});


onMounted(() => {
 
});
</script>

<style scoped>
.styled-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 14px;
  background-color: #fff;
}

.styled-table th, .styled-table td {
  padding: 12px 15px;
  text-align: left;
}

.styled-table th {
  background-color: #696464;
  color: white;
}

.styled-table tbody tr {
  transition: background-color 0.3s ease;
}

.styled-table tbody tr.inverted-row {
  background-color: #f2f2f2;
}

.styled-table tbody tr.hover-row:hover {
  background-color: #e0e0e0;
}

.styled-table td {
  border-top: 1px solid #ddd;
}

.styled-table td:first-child {
  border-left: 1px solid #ddd;
}

.styled-table th, .styled-table td {
  border-bottom: 1px solid #ddd;
}
.summary-row {
  font-weight: bold;
  background-color: #f0f0f0;
}
</style>
