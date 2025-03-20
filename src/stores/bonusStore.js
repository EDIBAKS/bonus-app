import { defineStore } from "pinia";
import { supabase } from "../boot/supabase";
import { useStoreAuth } from "./storeAuth";

export const useBonusStore = defineStore("bonusStore", {
  state: () => ({
    bonuses: [],
    bonusData: [],
    mostRecentBonus: null,
    loading: false,
    subscription: null,
    dpcNames: [], // Holds column names
    Dpcs:[],
    selectedDPCs:[], // Stores fetched DPCs for user's department
    aggregateBonus:[], // Stores formatted bonus data
    pivotBonusData:[],
    selectedDPC :null // Store selected DPC
  }),

  actions: {
  
  

    async fetchBonuses(startDate, endDate, DistributorIDNO, selectedDpc) {
      this.loading = true;
    
      // Get the first and last date of the current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    
      // Ensure startDate and endDate are formatted correctly
      const formattedStartDate = startDate ? new Date(startDate).toISOString().split("T")[0] : firstDay;
      const formattedEndDate = endDate ? new Date(endDate).toISOString().split("T")[0] : lastDay;
    
      try {
        let query = supabase
          .from("Bonus")
          .select("*")
          .gte("BonusDate", formattedStartDate)
          .lte("BonusDate", formattedEndDate)
          .order("BonusDate", { ascending: false });
    
        if (DistributorIDNO) {
          query = query.eq("DistributorIDNO", DistributorIDNO);
        }
    
        const { data: bonuses, error: bonusError } = await query;
    
        if (bonusError) {
          console.error("Error fetching bonuses:", bonusError);
          this.loading = false;
          return;
        }
    
        if (!bonuses.length) {
          this.bonuses = [];
          this.mostRecentBonus = null;
          this.loading = false;
          return;
        }
    
        // Extract unique DistributorIDNOs from bonuses
        const distributorIDs = [...new Set(bonuses.map(bonus => bonus.DistributorIDNO))];
    
        // Fetch Distributor details
        const { data: distributors, error: distributorError } = await supabase
          .from("Distributors")
          .select("DistributorIDNO, DistributorNames, DistributorPosition, RegisteredDPC")
          .in("DistributorIDNO", distributorIDs);
    
        if (distributorError) {
          console.error("Error fetching distributors:", distributorError);
          this.loading = false;
          return;
        }
    
        // Create a map for fast lookup
        const distributorMap = Object.fromEntries(distributors.map(d => [d.DistributorIDNO, d]));
    
        // Merge distributor details into bonuses
        let filteredBonuses = bonuses.map(bonus => ({
          ...bonus,
          DistributorName: distributorMap[bonus.DistributorIDNO]?.DistributorNames || "Unknown",
          DistributorPosition: distributorMap[bonus.DistributorIDNO]?.DistributorPosition || "Unknown",
          RegisteredDPC: distributorMap[bonus.DistributorIDNO]?.RegisteredDPC || null,
        }));
    
        // If selectedDpc is provided, filter bonuses by RegisteredDPC
        if (selectedDpc) {
          filteredBonuses = filteredBonuses.filter(bonus => bonus.RegisteredDPC === selectedDpc);
        }
    
        // Order bonuses by DistributorName in ascending order
        this.bonuses = filteredBonuses.sort((a, b) => a.DistributorName.localeCompare(b.DistributorName));
    
        this.mostRecentBonus = this.bonuses.length ? this.bonuses[0] : null;
        this.loading = false;
    
        // ✅ Log the structured bonuses in the console
        console.log("Fetched Bonuses:", JSON.stringify(this.bonuses, null, 2));
    
      } catch (error) {
        console.error("Error fetching data:", error);
        this.loading = false;
      }
    },
    


    async fetchBonusesWithDPCSummary(startDate, endDate) {
      this.loading = true;
    
      try {
        // Format start and end dates
        const formattedStartDate = startDate
          ? new Date(startDate).toISOString().split("T")[0]
          : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    
        const formattedEndDate = endDate
          ? new Date(endDate).toISOString().split("T")[0]
          : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];
    
        // Fetch bonuses within the date range
        const { data: bonuses, error: bonusError } = await supabase
          .from("Bonus")
          .select("DistributorIDNO, BonusValue, Status, BonusDate")
          .gte("BonusDate", formattedStartDate)
          .lte("BonusDate", formattedEndDate);
    
        if (bonusError) {
          console.error("Error fetching bonuses:", bonusError);
          this.loading = false;
          return;
        }
    
        if (!bonuses || bonuses.length === 0) {
          this.bonuses = [];
          this.dpcSummary = [];
          this.loading = false;
          return;
        }
    
        // Extract unique DistributorIDNOs
        const distributorIDs = [...new Set(bonuses.map(b => b.DistributorIDNO))];
    
        // Fetch Distributor details (RegisteredDPC)
        const { data: distributors, error: distributorError } = await supabase
          .from("Distributors")
          .select("DistributorIDNO, RegisteredDPC")
          .in("DistributorIDNO", distributorIDs);
    
        if (distributorError) {
          console.error("Error fetching distributors:", distributorError);
          this.loading = false;
          return;
        }
    
        // Create a map for fast lookup of RegisteredDPC based on DistributorIDNO
        const distributorMap = Object.fromEntries(
          distributors.map(d => [d.DistributorIDNO, d.RegisteredDPC || "Unknown"])
        );
    
        // Call the function to compute totals per DPC
        this.dpcSummary = this.computeDPCSummary(bonuses, distributorMap);
    
        console.log("DPC Summary:", this.dpcSummary);
        this.loading = false;
      } catch (error) {
        console.error("Error fetching data:", error);
        this.loading = false;
      }
    },
    

 // **Fetch DPCs for the current user's department**

async fetchDPCs() {
  const storeAuth = useStoreAuth();
  const userDepartment = storeAuth.userDetails?.department;

  if (!userDepartment) {
    console.error("Department not found in authStore!");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("dpc")
      .select("dpccode, dpcname")
      .eq("department", userDepartment);

    if (error) throw error;

    this.Dpcs = data || []; // Ensure the Dpcs array gets populated
    console.log("Fetched DPCs:", this.Dpcs); // Debugging
  } catch (err) {
    console.error("Error fetching DPCs:", err.message);
  }
},

async fetchBonusAggregate(startDate, endDate) {
  const storeAuth = useStoreAuth()
  const department = storeAuth.userDetails?.department // Get department

  console.log("Retrieved department:", department) // Debugging log

  if (!department) {
    console.error("User department is not available.")
    return
  }

  // Check if startDate and endDate are valid (not empty or invalid)
  if (!startDate || !endDate || startDate === "" || endDate === "") {
    console.error("Invalid date range: startDate or endDate is empty.");
    return; // Return early if dates are invalid
  }

  // Format startDate and endDate to 'YYYY-MM-DD'
  const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
  const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

  console.log("Formatted Start Date:", formattedStartDate); // Debugging log
  console.log("Formatted End Date:", formattedEndDate); // Debugging log

  this.loading = true // Start loading state

  try {
    // Fetch the aggregated bonus data using the provided date range and department
    const { data, error: fetchError } = await supabase.rpc('get_bonus_summary', { 
      start_date: formattedStartDate, 
      end_date: formattedEndDate, 
      department_name: department 
    });

    this.loading = false // Stop loading

    if (fetchError) {
      console.error('Error fetching bonus aggregate:', fetchError);
      return
    }

    aggregateBonus.value = data // Store fetched data
  } catch (error) {
    this.loading = false // Stop loading in case of a general error
    console.error('Unexpected error:', error);
  }
},
    async fetchBonusSummary(startDate, endDate) {
      //const supabase = useSupabaseClient()
      const storeAuth = useStoreAuth()
      const department = storeAuth.userDetails?.department // Get department

      console.log("Retrieved department:", department) // Debugging log

      if (!department) {
        console.error("User department is not available.")
        return
      }

      this.loading = true // Start loading state

      const { data, error } = await supabase
        .rpc('get_bonus_summary', { 
          start_date: startDate, 
          end_date: endDate, 
          department_name: storeAuth.userDetails?.department 
        })

      this.loading = false // Stop loading

      if (error) {
        console.error('Error fetching bonus summary:', error)
        return
      }

      //console.log("Fetched bonus summary:", data) // Debugging log

      this.bonusData = data // Push fetched data into bonusData
    },
  
      async updateStatus1(id) {
      const confirmUpdate = confirm("Mark this bonus as Paid?");
      if (!confirmUpdate) return;

      const now = new Date();
      const currentDateTime = now.toISOString().split("T")[0] + " " + now.toTimeString().split(" ")[0];

      const storeAuth = useStoreAuth();
      const paidBy = storeAuth.userDetails?.username || "Unknown";
      //const userId=storeAuth.userDetails?.id ||"Unknown"
      const { error } = await supabase
        .from("Bonus")
        .update({ Status: "Paid", PaymentDate: currentDateTime, PaidBy: paidBy,user_id:storeAuth.userDetails.id })
        .eq("id", id);

      if (!error) {
        const index = this.bonuses.findIndex((b) => b.id === id);
        if (index !== -1) {
          this.bonuses[index].Status = "Paid";
          this.bonuses[index].PaymentDate = currentDateTime;
          this.bonuses[index].PaidBy = paidBy;
        }
      } else {
        console.error("Error updating status:", error);
      }
    },

    async updateStatus(id) {
      const now = new Date();
      const currentDateTime = now.toISOString().split("T")[0] + " " + now.toTimeString().split(" ")[0];
    
      const storeAuth = useStoreAuth();
      const paidBy = storeAuth.userDetails?.username || "Unknown";
    
      const { error } = await supabase
        .from("Bonus")
        .update({ Status: "Paid", PaymentDate: currentDateTime, PaidBy: paidBy, user_id: storeAuth.userDetails.id })
        .eq("id", id);
    
      if (!error) {
        const index = this.bonuses.findIndex((b) => b.id === id);
        if (index !== -1) {
          this.bonuses[index].Status = "Paid";
          this.bonuses[index].PaymentDate = currentDateTime;
          this.bonuses[index].PaidBy = paidBy;
        }
      } else {
        console.error("Error updating status:", error);
      }
    },
    

    async bonusPivotTable2(startDate, endDate) {
      const storeAuth = useStoreAuth();
      const department = storeAuth.userDetails?.department;
    
      console.log("Retrieved department:", department);
    
      if (!department) {
        console.error("User department is not available.");
        return;
      }
    
      // ✅ Extract the actual values from Vue refs
      const startDateValue = startDate.value;
      const endDateValue = endDate.value;
    
      console.log("Raw Start Date:", startDateValue);
      console.log("Raw End Date:", endDateValue);
    
      // ✅ Ensure startDate and endDate are valid before conversion
      if (!startDateValue || !endDateValue) {
        console.error("Error: Missing start or end date.");
        return;
      }
    
      try {
        const parsedStartDate = new Date(startDateValue);
        const parsedEndDate = new Date(endDateValue);
    
        // ✅ Check if the dates are valid
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          console.error("Error: Invalid date format.", { startDate: startDateValue, endDate: endDateValue });
          return;
        }
    
        const formattedStartDate = parsedStartDate.toISOString().split("T")[0];
        const formattedEndDate = parsedEndDate.toISOString().split("T")[0];
    
        console.log("Formatted Start Date:", formattedStartDate);
        console.log("Formatted End Date:", formattedEndDate);
    
        this.loading = true;
    
        // 🔥 Fetch pivot table data
        const { data, error } = await supabase.rpc('get_bonus_pivot_table', {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          department_name: department
        });
    
        this.loading = false;
    
        if (error) {
          console.error('Error fetching bonus pivot table:', error);
          return;
        }
    
        console.log("Fetched bonus pivot data:", data);
    
        // Transform data into pivot table format
        const pivotTable = {};
        data.forEach(({ payment_date, dpc, totalpaidbonus }) => {
          if (!pivotTable[payment_date]) {
            pivotTable[payment_date] = {}; // Initialize row
          }
          pivotTable[payment_date][dpc] = totalpaidbonus || 0;
        });
    
        this.pivotBonusData = pivotTable;
        console.log("Transformed Pivot Table:", pivotTable);
        
      } catch (error) {
        console.error("Unexpected error while processing dates:", error);
      }
    },

    async bonusPivotTable1(startDate, endDate) {
      const storeAuth = useStoreAuth();
      const department = storeAuth.userDetails?.department;
      
      if (!department) {
        console.error("User department is not available.");
        return;
      }
    
      // Extract actual values from Vue refs
      const startDateValue = startDate.value;
      const endDateValue = endDate.value;
    
      if (!startDateValue || !endDateValue) {
        console.error("Error: Missing start or end date.");
        return;
      }
    
      try {
        const parsedStartDate = new Date(startDateValue);
        const parsedEndDate = new Date(endDateValue);
    
        // Check if the dates are valid
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          console.error("Error: Invalid date format.", { startDate: startDateValue, endDate: endDateValue });
          return;
        }
    
        const formattedStartDate = parsedStartDate.toISOString().split("T")[0];
        const formattedEndDate = parsedEndDate.toISOString().split("T")[0];
    
        this.loading = true;
    
        // 🔥 Fetch bonus data
        const { data, error } = await supabase.rpc('get_bonus_pivot_table', {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          department_name: department
        });
    
        this.loading = false;
    
        if (error) {
          console.error('Error fetching bonus pivot table:', error);
          return;
        }
    
        // Fetch all DPC names within the department
        const { data: dpcNames, error: dpcError } = await supabase
          .from('dpc')
          .select('dpcname')
          .eq('department', department);
    
        if (dpcError) {
          console.error('Error fetching DPC names:', dpcError);
          return;
        }
    
        // Initialize an empty pivot table
        const pivotTable = {};
    
        // Initialize columns for each DPC, setting their initial value to 0
        const dpcColumnNames = dpcNames.map((row) => row.dpcname);
        
        // Initialize rows (payment dates) with all DPCs set to 0
        data.forEach(({ payment_date, dpc, totalpaidbonus }) => {
          if (!pivotTable[payment_date]) {
            pivotTable[payment_date] = {};
            // Initialize all DPCs with 0 if not already present
            dpcColumnNames.forEach((dpcname) => {
              pivotTable[payment_date][dpcname] = 0;
            });
          }
          // Set the bonus value for the respective DPC
          pivotTable[payment_date][dpc] = totalpaidbonus || 0;
        });
    
        // Return the complete pivot table with all DPCs and dates
        this.pivotBonusData = pivotTable;
        console.log("Transformed Pivot Table:", pivotTable);
    
      } catch (error) {
        console.error("Unexpected error while processing dates:", error);
      }
    },
    async bonusPivotTable(startDate, endDate) {
      const storeAuth = useStoreAuth();
      const department = storeAuth.userDetails?.department;
    
      if (!department) {
        console.error("User department is missing.");
        return;
      }
    
      const startDateValue = startDate.value;
      const endDateValue = endDate.value;
    
      if (!startDateValue || !endDateValue) {
        console.error("Error: Missing start or end date.");
        return;
      }
    
      try {
        const formattedStartDate = new Date(startDateValue).toISOString().split("T")[0];
        const formattedEndDate = new Date(endDateValue).toISOString().split("T")[0];
    
        this.loading = true;
    
        // Fetch data from Supabase
        const { data, error } = await supabase.rpc('get_bonus_pivot_table', {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          department_name: department
        });
    
        this.loading = false;
    
        if (error) {
          console.error('Error fetching bonus pivot table:', error);
          return;
        }
    
        console.log("Fetched bonus pivot data:", data); // 🔍 Check what is actually fetched
    
        if (!data || data.length === 0) {
          console.warn("No data received.");
          this.pivotBonusData = {};
          return;
        }
    
        // ✅ Transform data into pivot table format
        const pivotTable = {};
        const dpcNamesSet = new Set(); // Track unique DPC names
    
        data.forEach(({ payment_date, dpc, totalpaidbonus }) => {
          if (!pivotTable[payment_date]) {
            pivotTable[payment_date] = {};
          }
    
          pivotTable[payment_date][dpc] = totalpaidbonus || 0;
          if (dpc) dpcNamesSet.add(dpc); // Store DPC names
        });
    
        this.pivotBonusData = pivotTable;
        this.dpcNames = Array.from(dpcNamesSet); // Store DPC names for table headers
    
        console.log("Transformed Pivot Table:", pivotTable);
        console.log("DPC Names:", this.dpcNames);
    
      } catch (error) {
        console.error("Unexpected error while processing dates:", error);
      }
    },

    async fetchBonusPivotTable1(startDate, endDate) {
      const storeAuth = useStoreAuth();  // Reference to authentication store
      //const storeBonus = useStoreBonus(); // Reference to the bonus store (where the function is)
      const department = storeAuth.userDetails?.department;
    
      if (!department) {
        console.error("User department is not available.");
        return;
      }
    
      // ✅ Ensure startDate and endDate are provided
      if (!startDate || !endDate) {
        console.error("Error: Missing start or end date.", { startDate, endDate });
        return;
      }
    
      try {
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
    
        // ✅ Validate date parsing
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          console.error("Error: Invalid date format.", { startDate, endDate });
          return;
        }
    
        const formattedStartDate = parsedStartDate.toISOString().split("T")[0];
        const formattedEndDate = parsedEndDate.toISOString().split("T")[0];
    
        console.log("Fetching pivot data from:", formattedStartDate, "to", formattedEndDate);
    
        const { data, error } = await supabase.rpc("get_bonus_pivot_table", {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          department_name: department,
        });
    
        if (error) {
          console.error("Error fetching bonus pivot table:", error);
          return;
        }
    
        console.log("Fetched bonus pivot data:", data);
    
        // ✅ Process data
        const pivotTable = {};
        const dpcSet = new Set();
    
        data.forEach(({ payment_date, dpc, totalpaidbonus }) => {
          if (!pivotTable[payment_date]) {
            pivotTable[payment_date] = {};
          }
          pivotTable[payment_date][dpc] = totalpaidbonus || 0;
          dpcSet.add(dpc);
        });
    
        // ✅ Store data in Pinia state (set values directly in the store)
        storeBonus.setPivotBonusData(pivotTable);
        storeBonus.setDpcNames(Array.from(dpcSet).sort());
    
        console.log("Transformed Pivot Table:", pivotTable);
    
      } catch (error) {
        console.error("Unexpected error while fetching data:", error);
      }
    },
    
    async fetchBonusPivotTable(startDate, endDate) {
      const storeAuth = useStoreAuth();  // Reference to authentication store
      const department = storeAuth.userDetails?.department;
    
      if (!department) {
        console.error("User department is not available.");
        return;
      }
    
      // ✅ Ensure startDate and endDate are provided
      if (!startDate || !endDate) {
        console.error("Error: Missing start or end date.", { startDate, endDate });
        return;
      }
    
      try {
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
    
        // ✅ Validate date parsing
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          console.error("Error: Invalid date format.", { startDate, endDate });
          return;
        }
    
        const formattedStartDate = parsedStartDate.toISOString().split("T")[0];
        const formattedEndDate = parsedEndDate.toISOString().split("T")[0];
    
        console.log("Fetching pivot data from:", formattedStartDate, "to", formattedEndDate);
    
        const { data, error } = await supabase.rpc("get_bonus_pivot_table", {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          department_name: department,
        });
    
        if (error) {
          console.error("Error fetching bonus pivot table:", error);
          return;
        }
    
        console.log("Fetched bonus pivot data:", data);
    
        // ✅ Process data
        const pivotTable = {};
        const dpcSet = new Set();
    
        data.forEach(({ payment_date, dpc, totalpaidbonus }) => {
          if (!pivotTable[payment_date]) {
            pivotTable[payment_date] = {};
          }
          pivotTable[payment_date][dpc] = totalpaidbonus || 0;
          dpcSet.add(dpc);
        });
    
        // ✅ Store data in Pinia state (set values directly in the store)
        this.setPivotBonusData(pivotTable);
        this.setDpcNames(Array.from(dpcSet).sort());
    
        console.log("Transformed Pivot Table:", pivotTable);
    
      } catch (error) {
        console.error("Unexpected error while fetching data:", error);
      }
    },
    setPivotBonusData(data) {
      this.pivotBonusData = data;
    },
    setDpcNames(names) {
      this.dpcNames = names;
    },
  
    
    
    
    clearEntries() {
      this.bonuses = [];
      this.dpcNames = [];
    },
  
  clearEntries(){
this.bonuses.value=[]
  },

    subscribeToBonuses() {
      if (this.subscription) {
        console.log("Already subscribed to bonus updates.");
        return;
      }

      this.subscription = supabase
        .channel("BonusUpdates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "Bonus" },
          (payload) => {
            console.log("Bonus table updated:", payload);

            if (payload.eventType === "INSERT") {
              this.bonuses.unshift(payload.new);
            } else if (payload.eventType === "UPDATE") {
              const index = this.bonuses.findIndex((b) => b.id === payload.new.id);
              if (index !== -1) {
                this.bonuses[index] = payload.new;
              }
            } else if (payload.eventType === "DELETE") {
              this.bonuses = this.bonuses.filter((b) => b.id !== payload.old.id);
            }
          }
        )
        .subscribe();
    },

    unsubscribeFromBonuses() {
      if (this.subscription) {
        supabase.removeChannel(this.subscription);
        this.subscription = null;
        console.log("Unsubscribed from bonus updates.");
      }
    },
  },

});
