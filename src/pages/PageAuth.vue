<template>
  <q-page class="flex flex-center q-pa-sm">
    <q-card
      class="auth bg-primary text-white q-pa-lg"
      style="width: 450px;"
    >
      <q-card-section>
        <ToolbarTitle />
      </q-card-section>
      <q-card-section>
        <q-tabs
          v-model="tab"
          no-caps
        >
          <q-tab name="login" label="Login" />
          <!--
          <q-tab name="register" label="Register" />
          -->
        </q-tabs>
      </q-card-section>
      <q-card-section>
        <q-form
          @submit="formSubmit"
        >
          <q-input
            v-model="credentials.email"
            class="q-mb-md"
            :bg-color="useLightOrDark('white', 'black')"
            label="Email"
            type="email"
            autocomplete="email"
            filled
          />
          <q-input
            v-model="credentials.password"
            class="q-mb-md"
            :bg-color="useLightOrDark('white', 'black')"
            label="Password"
            type="password"
            autocomplete="current-password"
            filled
          />
          <!--
          <div v-if="tab === 'register'">

            <q-input
            v-model="credentials.username"
            class="q-mb-md"
            :bg-color="useLightOrDark('white', 'black')"
            label="Username"
            
            
            filled
          />
          <q-input
            v-model="credentials.names"
            class="q-mb-md"
            :bg-color="useLightOrDark('white', 'black')"
            label="Names"
           
           
            filled
          />
          <q-input
            v-model="credentials.telephone"
            class="q-mb-md"
            :bg-color="useLightOrDark('white', 'black')"
            label="Telephone"
            filled
          />
          <q-select
           filled
           class="q-mb-md"
            v-model="credentials.role"
            :bg-color="useLightOrDark('white', 'black')"
            
            option-label="title"
             option-value="title"
              label="Role"
              emit-value
              map-options 
              />
             
              <q-select
               filled
               class="q-mb-md"
                v-model="credentials.department"
               :bg-color="useLightOrDark('white', 'black')"
               
                option-label="name"
                option-value="name"
                 label="Department"
                 emit-value
                 map-options 
                  />

          </div>
-->
          <q-btn
            class="full-width"
            color="white"
            type="submit"
            :label="submitButtonTitle"
            outline
            no-caps
          />
        </q-form>
      </q-card-section>


</q-card>
  </q-page>
</template>
<script setup>
import { ref,reactive,computed } from 'vue';
import { useQuasar } from 'quasar';
//import { useRouter } from 'vue-router';
import ToolbarTitle from 'src/components/ToolbarTitle.vue';
import { useLightOrDark } from 'src/use/useLightOrDark';
import { useStoreAuth } from 'src/stores/storeAuth';
const storeAuth=useStoreAuth()
const tab=ref('login')
const $q=useQuasar()
//const router=useRouter()
const credentials = reactive({
      email: '',
      password: '',
      names:'',
      username:'',
      telephone:'',
      role:'',
      department:''
    })
    const submitButtonTitle = computed(() => {
      return tab.value === 'login' ? 'Login' : 'Register'
    })
    const formSubmit = () => {
      if (!credentials.email || !credentials.password) {
        $q.dialog({
          title: 'Error',
          message: 'Please enter an email & password motherflipper!'
        })
      }
      else {
        formSubmitSuccess()
      }
    }
const formSubmitSuccess=()=>{
  if(tab.value ==='register'){
storeAuth.registerUser(credentials)
  }else{
    storeAuth.loginUser(credentials)
    
  }
 
}


</script>
