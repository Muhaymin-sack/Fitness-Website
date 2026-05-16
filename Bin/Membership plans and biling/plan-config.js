/* Shared Plan Configuration & Storage */
var PlanConfig = {
    // Default plans data
    plans: {
        basic:   { label:'Basic',    name:'Basic',    sub:'Membership', mo:25,  yr:240, benefits:['Gym floor (weights + cardio)','Off-peak & standard hours','Changing rooms',null,null,null] },
        standard:{ label:'Standard', name:'Standard', sub:'Full Access', mo:45,  yr:432, benefits:['Full gym floor access','All group classes','Full opening hours','Locker access','Free induction session',null] },
        premium: { label:'Premium',  name:'Premium',  sub:'Membership', mo:65,  yr:624, benefits:['Full gym + classes + premium zones','Sauna, steam & functional area','Priority class booking','2 guest passes / month','Merch & supplement discounts','Dedicated locker'] },
        student: { label:'Student',  name:'Student',  sub:'Plan',       mo:20,  yr:192, benefits:['Standard gym + all classes','Full opening hours','Locker access','Valid Student ID required',null,null] }
    },

    // Save user's selected plan
    savePlan: function(planKey, cycle) {
        var data = {
            plan: planKey,
            cycle: cycle || 'monthly',
            start: new Date().toISOString(),
            status: 'active'
        };
        localStorage.setItem('userPlan', JSON.stringify(data));
    },

    // Load user's plan
    loadPlan: function() {
        var data = localStorage.getItem('userPlan');
        if (data) {
            try {
                return JSON.parse(data);
            } catch(e) {
                return null;
            }
        }
        return null;
    },

    // Get plan details
    getPlan: function(key) {
        return this.plans[key] || null;
    },

    // Check if user has a saved plan
    hasPlan: function() {
        return !!this.loadPlan();
    },

    // Clear saved plan
    clearPlan: function() {
        localStorage.removeItem('userPlan');
    }
};
