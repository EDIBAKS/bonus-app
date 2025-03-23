<template>
  <q-page class="q-pa-md">
    <q-card flat>
      <div class="q-pa-md">
  <q-input v-model="startDate" label="Start Date" type="date" filled dense class="q-mb-md" />
  <q-input v-model="endDate" label="End Date" type="date" filled dense class="q-mb-md" />
  <q-input v-model="DistributorIDNO" label="Distributor ID" filled dense class="q-mb-md" />
  
  <input
      v-model="searchQuery"
      type="text"
      placeholder="Search by name"
      class="search-input"
    />
    
    <ul v-if="filteredDistributors.length && searchQuery.trim() !== ''">
      <li
        v-for="distributor in filteredDistributors"
        :key="distributor.DistributorIDNO"
        @click="selectDistributor(distributor)"
        class="distributor-option"
      >
        {{ distributor.DistributorNames }}
      </li>
    </ul>

    <p v-else>No results found</p>

 

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
    <div v-if="!loading && (selectedDPC || searchQuery || DistributorIDNO)" class="text-bold text-primary">
  <div v-if="selectedDPC && !searchQuery && !DistributorIDNO">
    <div>Bonus For:</div>
    <div>{{ selectedDPC }}</div>
    <div>Date Range: {{ startDate }} to {{ endDate }}</div>
  </div>

  <div v-else-if="searchQuery && DistributorIDNO">
    <div>Bonus For:</div>
    <div>{{ searchQuery }} (ID: {{ DistributorIDNO }})</div>
    <div>Date Range: {{ startDate }} to {{ endDate }}</div>
  </div>

  <div v-else-if="DistributorIDNO && !searchQuery">
    <div>Bonus For:</div>
    <div>Distributor ID: {{ DistributorIDNO }}</div>
    <div>From: {{ startDate }} to {{ endDate }}</div>
  </div>

  <div v-else-if="searchQuery && !DistributorIDNO">
    <div>Bonus For:</div>
    <div>{{ searchQuery }}</div>
    <div>From: {{ startDate }} to {{ endDate }}</div>
  </div>

  <div v-else>
    <div>Bonus List between:</div>
    <div>{{ startDate }} and {{ endDate }}</div>
  </div>
</div>



  </q-col>

  <!-- Right: Date Range & DPC -->
  <q-col cols="4" class="text-right">
    <div class="text-bold q-mr-md">
      <div v-if="store.bonuses.length">
        <div class="row q-gutter-sm justify-center">
    <!-- UnPaid Card -->
    <q-card class="bg-red text-white q-pa-sm col-2 q-mb-sm rounded-borders">
      <q-card-section class="text-center q-pa-sm">
        <div class="text-bold text-subtitle1">UnPaid</div>
        <div class="text-bold text-h6">{{convertCurrency( totalUnPaid) }}</div>
      </q-card-section>
    </q-card>

    <!-- Paid Card -->
    <q-card class="bg-green text-white q-pa-sm col-2 q-mb-sm rounded-borders">
      <q-card-section class="text-center q-pa-sm">
        <div class="text-bold text-subtitle1">Paid</div>
        <div class="text-bold text-h6">{{convertCurrency( totalPaid) }}</div>
      </q-card-section>
    </q-card>
  </div>
    </div>
    </div>
   
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
  <div class="row items-center no-wrap">
    <q-btn
      size="10px"
      :color="props.row.Status === 'Paid' ? 'green' : 'red'"
      :label="props.row.Status"
      :disable="props.row.Status === 'Paid'"
      @click="confirmUpdate(props.row.id)"
    />
    
    <!-- Show undo icon only when Status is 'Paid' and role is 'SuperAdmin' -->
    <q-icon 
      v-if="props.row.Status === 'Paid' && storeAuth.userDetails?.role === 'SuperAdmin'"
      name="undo" 
      size="15px" 
      class="q-ml-sm cursor-pointer"
      @click="confirmReverseStatus(props.row.id)"
    />
  </div>
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
import { supabase } from "../boot/supabase";
import { ref, onMounted,watch,computed,watchEffect, onUnmounted} from "vue";
import { useBonusStore } from "../stores/bonusStore";
import { useCurrency } from "src/composables/useCurrency";
import { useStoreAuth } from "src/stores/storeAuth";
import { useQuasar } from 'quasar';

const searchQuery = ref(''); // Search query for filtering
const distributors = ref([]);
const filteredDistributors = ref([]);
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
const confirmReverseStatus = (id) => {
  $q.dialog({
    title: 'Confirm Reversal',
    message: 'Are you sure you want to revert the status to UnPaid?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    store.reverseStatus(id);
  }).onCancel(() => {
    console.log('Reversal canceled');
  });
};

const fetchDistributors = async (query) => {
  const { data, error } = await supabase
    .from('Distributors')
    .select('DistributorIDNO, DistributorNames')
    .ilike('DistributorNames', `%${query}%`);

  if (error) {
    console.error("Error fetching distributors:", error);
  } else {
    distributors.value = data;
  }
};
// Select a distributor from the list
const selectDistributor = (distributor) => {
  // Populate the search field and Distributor ID input
  searchQuery.value = distributor.DistributorNames;
  DistributorIDNO.value = distributor.DistributorIDNO;

  // Optionally, clear the list of filtered results after selection
  filteredDistributors.value = [];

  // Focus on the search input field again
  document.querySelector('.search-input').focus();
};

// Watch for changes in searchQuery and fetch matching distributors
watchEffect(() => {
  if (searchQuery.value.trim() !== '') {
    fetchDistributors(searchQuery.value);
  } else {
    distributors.value = [];
  }
});

// Filter distributors based on searchQuery
watchEffect(() => {
  filteredDistributors.value = distributors.value.filter((distributor) =>
    distributor.DistributorNames.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});



const fetchBonuses1 = () => {
  loading.value = true; // Show loader

  // If a searchQuery is present, reset filters to fetch the entire dataset
  if (searchQuery.value) {
    //DistributorIDNO.value = null;
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

const fetchBonuses = () => {
  loading.value = true; // Show loader

  // Reset selectedDPC if searchQuery is present
  if (searchQuery.value) {
    selectedDPC.value = null; // Reset selectedDPC
  }

  // Step 1: Fetch all bonuses within the date range (unfiltered)
  store.fetchBonuses(startDate.value, endDate.value, DistributorIDNO.value, selectedDPC.value)
    .then(() => {
      // Step 2: Apply search query if there's one
      if (searchQuery.value) {
        // Filter locally after fetching complete data
        store.bonuses = store.bonuses.filter(bonus =>
          bonus.DistributorName.toLowerCase().includes(searchQuery.value.toLowerCase())
        );
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



const filterBonuses3 = () => {
  fetchBonuses(); // Re-fetch with the search term
};

// Computed property to filter bonuses by search query
const filteredBonuses2 = computed(() => {
  const bonuses = store.bonuses;
  if (!searchQuery.value) {
    return bonuses; // If no search query, show all bonuses
  }
  return bonuses.filter(bonus => 
    bonus.DistributorName.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
// Computed property to calculate total paid bonuses dynamically

// Computed property to filter bonuses by search query


const filteredBonuses = computed(() => {
  const bonuses = store.bonuses;
  if (!searchQuery.value) {
    console.log("Filtered Bonuses:", bonuses); // Log all bonuses when no search query
    return bonuses;
  }

  const filtered = bonuses.filter(bonus => 
    bonus.DistributorName.toLowerCase().includes(searchQuery.value.toLowerCase())
  );

  console.log("Filtered Bonuses with Search Query:", filtered); // Log filtered bonuses
  return filtered;
});

const totalPaid = computed(() => {
  return filteredBonuses2.value
    .filter(bonus => bonus.Status === 'Paid')
    .reduce((sum, bonus) => sum + (Number(bonus.BonusValue) || 0), 0) .toFixed(2); // Round to 2 decimal places; // Convert to number
});

const totalUnPaid = computed(() => {
  return filteredBonuses2.value
    .filter(bonus => bonus.Status === 'UnPaid')
    .reduce((sum, bonus) => sum + (Number(bonus.BonusValue) || 0), 0) .toFixed(2); // Round to 2 decimal places; // Convert to number
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

<style scoped>
.search-input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.distributor-option {
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid #ddd;
}

.distributor-option:hover {
  background-color: #f1f1f1;
}
</style>
