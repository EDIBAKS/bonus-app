<template>
  <q-page class="q-pa-md">
    <q-card flat>
      <div class="q-pa-md">
  <q-input v-model="startDate" label="Start Date" type="date" filled dense class="q-mb-md" />
  <q-input v-model="endDate" label="End Date" type="date" filled dense class="q-mb-md" />
  <q-input v-model="DistributorIDNO" label="Distributor ID" filled dense class="q-mb-md" />
  <q-input
  v-model="searchQuery"
  placeholder="Search by Distributor Name"
  class="q-mb-md"
  debounce="300"
  @update:model-value="fetchBonuses"
/>

 
    <!--
  <q-select
  v-model="selectedDPC"
  :options="store.Dpcs"
  label="Select DPC"
  option-value="dpccode"
  option-label="dpcname"
  filled
  dense
  class="q-ml-md"
  emit-value
  map-options
  @update:model-value="fetchBonuses()"
/>
-->
<q-select
  v-model="selectedDPC"
  :options="store.Dpcs"
  label="Select DPC"
  option-value="dpccode"
  option-label="dpcname"
  filled
  dense
  
  emit-value
  map-options
  @update:model-value="fetchBonuses()"
/>

  <q-btn label="Search" color="primary" @click="fetchBonuses" class="q-mt-md full-width" />
</div>

     
<q-row class="q-mt-md items-center">
  <!-- Left: Radio Buttons -->
  <q-col cols="4" class="q-gutter-sm">
    <q-radio v-model="currencyType" label="USD" val="USD" color="primary" />
    <q-radio v-model="currencyType" label="Local Currency" val="LC" color="primary" />
  </q-col>

  <!-- Center: Title -->
  <q-col cols="4" class="text-center text-bold">
    <div v-if="selectedDPC && !searchQuery" class="text-bold text-primary">
   Bonus For: | {{ selectedDPC }}
  </div>

  </q-col>

  <!-- Right: Date Range & DPC -->
  <q-col cols="4" class="text-right">
    <div class="text-bold q-mr-md">{{ formattedDateRange }}</div>
   
  </q-col>
</q-row>

      <q-card class="full-width q-mt-md" flat>
          <!-- Search input field -->
 
  <q-card-section>

    <q-table
        flat
        bordered
        dense
        :rows="filteredBonuses"
        :columns="columns"
        row-key="id"
      >
      <!-- Bonus Date -->
      <template v-slot:body-cell-bonusDate="props">
        <q-td :props="props">
          <strong>{{ props.row.BonusDate }}</strong>
        </q-td>
      </template>

      <!-- Bonus Type -->
      <template v-slot:body-cell-distributorName="props">
    <q-td :props="props">
      {{ props.row.DistributorName }}
    </q-td>
  </template>

      <!-- Bonus Value -->
      <template v-slot:body-cell-bonusValue="props">
              <q-td :props="props">
                <span class="text-red-300">
                  <strong>
                  {{ convertCurrency(props.row.BonusValue) }}
                </strong>
                </span>
              </q-td>
            </template>

      <!-- Payment Date (Only if Paid) -->
      <template v-slot:body-cell-paymentDate="props">
  <q-td :props="props">
    <span v-if="props.row.Status === 'Paid'">{{ formatDate(props.row.PaymentDate) }}</span>
    <span v-else>N/A</span>
    <div v-if="props.row.Status === 'Paid'" class="text-blue text-caption q-mt-xs">
      By: {{ props.row.PaidBy }}
    </div>
  </q-td>
</template>

      <!-- Status Button -->
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <!--
          <q-btn
            flat
            :label="props.row.Status"
            :color="props.row.Status === 'Paid' ? 'green' : 'red'"
            :disable="props.row.Status === 'Paid'"
            @click="store.updateStatus(props.row.id)"
          />
-->
<q-btn
      size="10px"
      :color="props.row.Status === 'Paid' ? 'green' : 'red'"
      :label="props.row.Status"
      :disable="props.row.Status === 'Paid'"
      
      @click="confirmUpdate(props.row.id)"
    />
         
        </q-td>
      </template>

    </q-table>
  </q-card-section>

</q-card>

    <div v-if="store.bonuses.length">Total:</div>

      <q-spinner v-if="store.loading" class="q-mt-md" color="primary" size="lg" />
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted,watch,computed, onUnmounted} from "vue";
import { useBonusStore } from "../stores/bonusStore";
import { useCurrency } from "src/composables/useCurrency";
import { useStoreAuth } from "src/stores/storeAuth";
import { useQuasar } from 'quasar';
const searchQuery = ref(''); // Search query for filtering
const exchangeRate = 600;
const selectedDPC=ref(null)
const store = useBonusStore();
const storeAuth=useStoreAuth()
const startDate = ref(null);
const endDate = ref(null);
const DistributorIDNO = ref("");
const loading = ref(false); // Loading state
const { currencyType, convertCurrency } = useCurrency();  // Destructure the state and function
const currentUser=storeAuth.userDetails.username
const $q=useQuasar()
const formatDate = (dateString) => {
  
  const date = new Date(dateString);
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const columns = [
  { name: 'bonusDate', label: 'Bonus Date', align: 'left', field: 'BonusDate' },
  { name: 'distributorName', label: 'Distributor Name', align: 'left', field: 'DistributorName' }, // Updated
  { name: 'bonusValue', label: 'Bonus Value', align: 'left', field: 'BonusValue' },
  { name: 'paymentDate', label: 'Payment Date', align: 'left', field: 'PaymentDate' },
  { name: 'status', label: 'Status', align: 'center', field: 'Status' },
];

const confirmUpdate = (id) => {
  $q.dialog({
    title: 'Confirm Update',
    message: 'Are you sure you want to update the status?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    store.updateStatus(id);
  }).onCancel(() => {
    console.log('Update canceled');
  });
};


const fetchBonuses = () => {
  loading.value = true; // Show loader

  // If a searchQuery is present, reset filters to fetch the entire dataset
  if (searchQuery.value) {
    DistributorIDNO.value = null;
    selectedDPC.value = null; // Reset selectedDPC
  }

  // Step 1: Fetch all bonuses within the date range (unfiltered)
  store.fetchBonuses(startDate.value, endDate.value, DistributorIDNO.value, selectedDPC.value)
    .then(() => {
      // Step 2: Apply search query if there's one
      if (searchQuery.value) {
        // Only filter after fetching complete data
        store.fetchBonuses(startDate.value, endDate.value, null, null, searchQuery.value);
      }
    })
    .finally(() => {
      loading.value = false; // Hide loader when fetching is done
    });
};


const formattedDateRange = computed(() => {
  if (!startDate.value || !endDate.value) return "";
  
  const options = { month: "long", day: "2-digit" };
  const start = new Date(startDate.value).toLocaleDateString("en-US", options);
  const end = new Date(endDate.value).toLocaleDateString("en-US", options);

  return `${start} - ${end}`;
});



const filterBonuses = () => {
  fetchBonuses(); // Re-fetch with the search term
};

// Computed property to filter bonuses by search query
const filteredBonuses = computed(() => {
  const bonuses = store.bonuses;
  if (!searchQuery.value) {
    return bonuses; // If no search query, show all bonuses
  }
  return bonuses.filter(bonus => 
    bonus.DistributorName.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
onMounted(async () => {
  await store.fetchDPCs(); // Wait until DPCs are fetched
  console.log("dpcdata", store.Dpcs); // Log after fetching
 
  store.fetchBonuses();
  store.subscribeToBonuses(); // Subscribe to real-time updates
});

// Optional: Watch for changes in dpcs and log when updated
watch(() => store.Dpcs, (newDpcs) => {
  console.log("Updated DPCs:", newDpcs);
});
onUnmounted(() => {
  store.unsubscribeFromBonuses(); // Unsubscribe when leaving page
});

</script>

