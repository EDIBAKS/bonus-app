<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
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
            <BonusPivotTable :pivotData="bonusStore.pivotBonusData" :dpcNames="bonusStore.dpcNames" />
          <!-- Total Row -->
    <!-- Total Row -->
    
  </div>
      
       
   
          <div v-else>
            <p>No data available for the selected date range.</p>
          </div>
        </template>
        <template v-if="reportType === 'summary'">
          <q-col cols="4" class="q-gutter-sm">
    <q-radio v-model="currencyType" label="USD" val="USD" color="primary" />
    <q-radio v-model="currencyType" label="Local Currency" val="LC" color="primary" />
  </q-col>
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

// Compute total per DPC
// Watch for changes in pivotBonusData and update totals



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
</style>
