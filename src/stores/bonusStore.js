import { defineStore } from "pinia";
import { supabase } from "../boot/supabase";
import { useStoreAuth } from "./storeAuth";

export const useBonusStore = defineStore("bonusStore", {
  state: () => ({
    bonuses: [],
  
    bonusData: [],
    mostRecentBonus: null,
    searchQuery:null,
    loading: false,
    subscription: null,
    dpcNames: [], // Holds column names
    Dpcs:[],
    distributors: [],
   selectedDPCs:[], // Stores fetched DPCs for user's department
    aggregateBonus:[], // Stores formatted bonus data
    pivotBonusData:[],
    selectedDPC :null // Store selected DPC
  }),

  actions: {
  
    async fetchDistributors() {
      this.loading = true;
      
      try {
        let query = supabase
          .from("Distributors")
          .select("DistributorIDNO, DistributorNames, DistributorPosition, RegisteredDPC")
          .order("DistributorNames", { ascending: true });

        if (this.searchQuery) {
          query = query.ilike("DistributorNames", `%${this.searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching distributors:", error);
          this.loading = false;
          return;
        }

        this.distributors = data || [];
        console.log("Fetched Distributors:", this.distributors);
      } catch (error) {
        console.error("Unexpected error fetching distributors:", error);
      } finally {
        this.loading = false;
      }
    },


    
    async fetchBonuses(startDate, endDate, DistributorIDNO, selectedDpc) {
      this.loading = true;
      this.bonuses = []; // Ensure bonuses are empty at the start
    
      // Get the first and last date of the current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    
      // Ensure startDate and endDate are formatted correctly
      const formattedStartDate = startDate ? new Date(startDate).toISOString().split("T")[0] : firstDay;
      const formattedEndDate = endDate ? new Date(endDate).toISOString().split("T")[0] : lastDay;
    
      console.log("Fetching bonuses for DistributorIDNO:", DistributorIDNO, "between:", formattedStartDate, "and", formattedEndDate); // Debugging log
    
      try {
        let query = supabase
          .from("Bonus")
          .select("*")
          .gte("BonusDate", formattedStartDate) // Start date filter
          .lte("BonusDate", formattedEndDate) // End date filter
          .order("BonusDate", { ascending: false }); // Sort by date descending
    
        // If DistributorIDNO is provided, filter bonuses for that distributor
        if (DistributorIDNO) {
          console.log("Filtering bonuses for DistributorIDNO:", DistributorIDNO); // Debugging log
          query = query.eq("DistributorIDNO", DistributorIDNO);
        }
    
        // **Ensure that pagination doesn't limit data**: Let's fetch more rows if necessary.
        query = query.limit(1000); // Fetch up to 1000 records (or more if needed)
    
        const { data: bonuses, error: bonusError } = await query;
    
        if (bonusError) {
          console.error("Error fetching bonuses:", bonusError);
          this.loading = false;
          return;
        }
    
        console.log("Fetched bonuses:", bonuses); // Debugging log
    
        if (!bonuses.length) {
          this.bonuses = []; // No bonuses found
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
    
        // Order bonuses by DistributorName in ascending order (optional)
        this.bonuses = filteredBonuses.sort((a, b) => a.DistributorName.localeCompare(b.DistributorName));
    
        this.mostRecentBonus = this.bonuses.length ? this.bonuses[0] : null;
        this.loading = false;
    
        // ✅ Log the structured bonuses in the console
        console.log("Final fetched bonuses:", JSON.stringify(this.bonuses, null, 2));
    
      } catch (error) {
        console.error("Error fetching data:", error);
        this.loading = false;
      }
    },
    
    async fetchBonuses5(startDate, endDate, DistributorIDNO, selectedDpc) {
      this.loading = true;
      this.bonuses = []; // Ensure bonuses are empty at the start
      this.totalPaid = 0; // Initialize TotalPaid
      this.totalUnPaid = 0; // Initialize TotalUnPaid
    
      // Get the first and last date of the current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    
      // Ensure startDate and endDate are formatted correctly
      const formattedStartDate = startDate ? new Date(startDate).toISOString().split("T")[0] : firstDay;
      const formattedEndDate = endDate ? new Date(endDate).toISOString().split("T")[0] : lastDay;
    
      console.log("Fetching bonuses for DistributorIDNO:", DistributorIDNO, "between:", formattedStartDate, "and", formattedEndDate); // Debugging log
    
      try {
        let query = supabase
          .from("Bonus")
          .select("*")
          .gte("BonusDate", formattedStartDate) // Start date filter
          .lte("BonusDate", formattedEndDate) // End date filter
          .order("BonusDate", { ascending: false }); // Sort by date descending
    
        // If DistributorIDNO is provided, filter bonuses for that distributor
        if (DistributorIDNO) {
          console.log("Filtering bonuses for DistributorIDNO:", DistributorIDNO); // Debugging log
          query = query.eq("DistributorIDNO", DistributorIDNO);
        }
    
        // Ensure that pagination doesn't limit data: Let's fetch more rows if necessary.
        query = query.limit(1000); // Fetch up to 1000 records (or more if needed)
    
        const { data: bonuses, error: bonusError } = await query;
    
        if (bonusError) {
          console.error("Error fetching bonuses:", bonusError);
          this.loading = false;
          return;
        }
    
        console.log("Fetched bonuses:", bonuses); // Debugging log
    
        if (!bonuses.length) {
          this.bonuses = []; // No bonuses found
          this.mostRecentBonus = null;
          this.totalPaid = 0;
          this.totalUnPaid = 0;
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
    
        // Calculate TotalPaid and TotalUnPaid dynamically
        filteredBonuses.forEach(bonus => {
          if (bonus.Status === "Paid") {
            this.totalPaid += bonus.Amount; // Assuming the Amount field holds the bonus amount
          } else if (bonus.Status === "Unpaid") {
            this.totalUnPaid += bonus.Amount; // Assuming the Amount field holds the bonus amount
          }
        });
    
        // Order bonuses by DistributorName in ascending order (optional)
        this.bonuses = filteredBonuses.sort((a, b) => a.DistributorName.localeCompare(b.DistributorName));
    
        this.mostRecentBonus = this.bonuses.length ? this.bonuses[0] : null;
        this.loading = false;
    
        // ✅ Log the structured bonuses in the console
        console.log("Final fetched bonuses:", JSON.stringify(this.bonuses, null, 2));
        console.log("Total Paid:", this.totalPaid);
        console.log("Total Unpaid:", this.totalUnPaid);
    
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
    async reverseStatus(id) {
      const storeAuth = useStoreAuth();
      const now = new Date();
      const currentDateTime = now.toISOString().split("T")[0] + " " + now.toTimeString().split(" ")[0];
      const { error } = await supabase
        .from("Bonus")
        .update({ Status: "UnPaid", PaymentDate: currentDateTime, PaidBy: "", user_id: storeAuth.userDetails.id })
        .eq("id", id);
    
      if (!error) {
        const index = this.bonuses.findIndex((b) => b.id === id);
        if (index !== -1) {
          this.bonuses[index].Status = "UnPaid";
          this.bonuses[index].PaymentDate = currentDateTime;
          this.bonuses[index].PaidBy = "";
        }
      } else {
        console.error("Error reverting status:", error);
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
