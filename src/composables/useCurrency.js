// src/composables/useCurrency.js

import { ref, watch } from "vue";

export function useCurrency() {
  // Default exchange rate and currency type state
  const exchangeRate = 600;  // Hardcoded for now
  const currencyType = ref("LC");  // Default to Local Currency

  // Function to convert currency based on selected currency type
  const convertCurrency = (amount) => {
    if (currencyType.value === "USD") {
      return amount;  // Return the value in USD
    }
    // Convert to Local Currency and remove decimals using Math.floor()
    return Math.floor(amount * exchangeRate);  // Remove decimals
  };

  // Watch for changes in currencyType to trigger necessary actions
  watch(currencyType, (newVal) => {
    console.log(`Currency type changed to: ${newVal}`);
    // Any additional logic you want to run when currency changes
  });

  // Return the state and the function to the component
  return {
    currencyType,
    convertCurrency,
  };
}
