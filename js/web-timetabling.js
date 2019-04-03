var app = new Vue({
    el: '#app',
    data: {
        events: [], //['a1', 'd1'],
        new_event_name: '',
        new_event_error: false,
        from_event: '',
        to_event: '',
		new_activity_weight: 1,
		new_activity_type: 'drive',
        lb: -Infinity,
        ub: Infinity,
        activities: [], //[{from: 'a1', to: 'd1', lb: 2, ub: Infinity, weight: 1}],
        cyclic_schedule: true,
        cyclic_period: 60,
		allow_infeasible: false,
		infeasible_penalty: 1000,
        solution: null,
        infeasible: false
    },
    methods: {
        saveData: function() {
            let text = JSON.stringify(extract_object(this));
            let element = document.createElement('a');
            element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', 'model.json');

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        },
		saveModel: function() {
            let model_data = build_model(this);
			let text = glpk.write(model_data.model);
            let element = document.createElement('a');
            element.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', 'model.lp');

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        },
        loadData: function() {
            let file_input = document.getElementById('file_input');
            file_input.value = '';
            file_input.click();
        },
        readData: function() {
            let app_object = this;
            let event_list = this.events;
            let act_list = this.activities;

            let file_input = document.getElementById('file_input');
            if (file_input.value != '') {
                let f = file_input.files[0];
                let reader = new FileReader();
                reader.addEventListener('load', function() {
                    let model_text = reader.result;
                    //console.log(model_text);
                    let model_obj = JSON.parse(model_text);
                    //console.log(model_obj);
                    event_list.splice(0,event_list.length);
                    act_list.splice(0,act_list.length);
                    for (var i=0; i < model_obj.events.length; i++) {
                        event_list.push(model_obj.events[i]);
                    }
                    for (var i=0; i < model_obj.activities.length; i++) {
                        let act = model_obj.activities[i];
                        if (act.lb == null) {
                            act.lb = -Infinity;
                        }
                        if (act.ub == null) {
                            act.ub = Infinity;
                        }
						if (!event_list.includes(act.from)) {
							event_list.push(act.from);
						}
						if (!event_list.includes(act.to)) {
							event_list.push(act.to);
						}
                        act_list.push(act);
                    }
                    app_object.cyclic_schedule = model_obj.cyclic_schedule;
                    app_object.cyclic_period = model_obj.cyclic_period;
					app_object.solution = null;
					if (typeof model_obj.allow_infeasble !== 'undefined') {
						app_object.allow_infeasbile = model_obj.allow_infeasible;
						app_object.infeasible_penalty = model_obj.infeasible_penalty;
					}
                });
                reader.readAsText(f);
            }
        },
        addEvent: function() {
            // TODO: input validation (i.e. non-empty string?)
            if (!this.events.includes(this.new_event_name) && this.new_event_name != '') {
                this.events.push(this.new_event_name);
                this.new_event_name = '';
                this.new_event_error = false;
            }
            else {
                this.new_event_error = true;
            }
        },
        addConstraint: function() {
            // TODO: input validation
            let lb = Number(this.lb);
            let ub = Number(this.ub);
            let weight = Number(this.new_activity_weight);
            if (this.from_event != '' && this.to_event != '' && this.from_event != this.to_event &&
                ((isFinite(lb) && !isNaN(lb)) || (isFinite(ub) && !isNaN(ub))) && lb <= ub && 
                isFinite(weight) && !isNaN(weight)) {
                    var constraint = {from: this.from_event, to: this.to_event, lb: lb, ub: ub, weight: weight, type: this.new_activity_type};
                    this.activities.push(constraint);
                    this.from_event = '';
                    this.to_event = '';
                    this.lb = -Infinity;
                    this.ub = Infinity;
					this.new_activity_weight = 1;
					if (this.new_activity_type == null || this.new_activity_type === '') {
						this.new_activity_type = 'drive';
					}
            }
        },
        deleteEvent: function(index) {
            let event = this.events.splice(index,1)[0];
            this.activities = this.activities.filter(function(act) {
                return act.from != event && act.to != event;
            });
        },
        deleteConstraint: function(index) {
            let constraint = this.activities.splice(index,1)[0];
            this.from_event = constraint.from;
            this.to_event = constraint.to;
            this.lb = constraint.lb;
            this.ub = constraint.ub;
			this.new_activity_weight = constraint.weight;
			if (constraint.type != null) {
				this.new_activity_type = constraint.type;
			}
			else {
				this.new_activity_type = '';
			}
        },
        solveLocal: function() {
        	
        	/*
         	*/
        	
			let model_data = build_model(this);
			let model = model_data.model;
			//console.log(objMap);
            //console.log(model);
			//console.log(glpk.write(model));
			//this.written_model = glpk.write(model);
            this.glpk_solution = glpk.solve(model, glpk.GLP_MSG_ALL);
			
            if (this.glpk_solution.result.status == glpk.GLP_OPT) {
                // Optimal solution found
                this.glpk_solution.result.z += model_data.objConstant;
                this.glpk_solution.eventMap = model_data.eventMap;
                this.glpk_solution.activityMap = model_data.activityMap;
                this.infeasible = false;
                this.solution = construct_solution(this.glpk_solution, model_data);
            }
            
            $('#solution-tab').tab('show');

            //console.log(this.solution);
        },
        solveServer: function() {
           	let obj = extract_object(this);
        	axios.post('/solve', obj)
        	     .then(response => {
        	    	 //console.log(response);
        	    	 this.solution = response.data;
        	    	 $('#solution-tab').tab('show');
        	     })
        	     .catch(error => {
        	    	 console.log(error);
        	     });       	
        },
        addLine: function(line_data) {	
        	let pre = line_data.name + 'a_';
        	
        	let o_dep = pre + '1_'+line_data.origin+'_dep';
        	let prev = o_dep;
        	if (!this.events.includes(o_dep)) {
        		this.events.push(o_dep);
        	}
        	for (var i=0; i < line_data.stops.length; i++) {
        		let stop = line_data.stops[i];
        		let ev_arr = pre + (i+2) + '_' + stop.stop + '_arr';
        		let ev_dep = pre + (i+2) + '_' + stop.stop + '_dep';
            	if (!this.events.includes(ev_arr)) {
            		this.events.push(ev_arr);
            	}
            	if (!this.events.includes(ev_dep) && i < line_data.stops.length - 1) {
            		this.events.push(ev_dep);
            	}
            	let drive_act = {from: prev, to: ev_arr, lb: stop.drive, ub: Infinity, weight: 1, type: 'drive'};
            	let dwell_act = {from: ev_arr, to: ev_dep, lb: stop.dwell, ub: Infinity, weight: 1, type: 'dwell'};
            	this.activities.push(drive_act);
            	if (i < line_data.stops.length - 1 ) {
            		this.activities.push(dwell_act);
            	}
            	prev = ev_dep;
        	}
        	if (line_data.both_ways) {
        		pre = line_data.name + 'b_';
        		let last_stop = line_data.stops[line_data.stops.length-1];
        		prev = pre + '1_' + last_stop.stop + '_dep';
        		if (!this.events.includes(prev)) {
            		this.events.push(prev);
            	}
        		let prev_drive = last_stop.drive;
        		for (var i=2; i <= line_data.stops.length; i++) {
            		let stop = line_data.stops[line_data.stops.length-i];
            		let ev_arr = pre + i + '_' + stop.stop + '_arr';
            		let ev_dep = pre + i + '_' + stop.stop + '_dep';
                	if (!this.events.includes(ev_arr)) {
                		this.events.push(ev_arr);
                	}
                	if (!this.events.includes(ev_dep)) {
                		this.events.push(ev_dep);
                	}
                	let drive_act = {from: prev, to: ev_arr, lb: prev_drive, ub: Infinity, weight: 1, type: 'drive'};
                	let dwell_act = {from: ev_arr, to: ev_dep, lb: stop.dwell, ub: Infinity, weight: 1, type: 'dwell'};
                	this.activities.push(drive_act);
               		this.activities.push(dwell_act);                	
                	prev = ev_dep;
                	prev_drive = stop.drive;
            	}
        		let o_arr = pre + (line_data.stops.length) + '_'+line_data.origin+'_arr';
        		if (!this.events.includes(o_arr)) {
            		this.events.push(o_arr);
            	}
            	let drive_act = {from: prev, to: o_arr, lb: prev_drive, ub: Infinity, weight: 1, type: 'drive'};
        		this.activities.push(drive_act);
        	}
        }
    }
});

function extract_object(ean) {
	return {
        events: ean.events,
        activities: ean.activities,
        cyclic_schedule: ean.cyclic_schedule,
        cyclic_period: ean.cyclic_period,
		allow_infeasble: ean.allow_infeasible,
		infeasible_penalty: ean.infeasible_penalty
    };
}

function build_model(ean) {
	let model = { 
		name: 'MIP',
		objective: {direction: glpk.GLP_MIN, name: 'obj', vars: []},
		subjectTo: [],
		generals: []
	};
	let eventMap = {};
	let objMap = {};
	let objConstant = 0;
	let varBound = {type: glpk.GLP_LO, lb: 0};
	if (ean.cyclic_schedule) {
		varBound = {type: glpk.GLP_DB, lb: 0, ub: ean.cyclic_period};
	}
	
	// Substitute vars for while equality activities exist
	let substMap = {};
	
	/*
	for (var i=0; i < ean.events.length; i++) {
		let ev = ean.events[i];
		substMap[ev] = ev;
	}
	*/

	for (var i=0; i < ean.events.length; i++) {
		UF.addSet(substMap, ean.events[i]);
	}
	for (var i=0; i < ean.activities.length; i++) {
		let activity = ean.activities[i];
		if (activity.lb == 0 && activity.ub == 0) {
			UF.union(substMap, activity.from, activity.to);
		}
	}
	
	// Construct variables and objectives for the representative variables
	for (var i=0; i < ean.events.length; i++) {
		let ev = ean.events[i];
		if (substMap[ev] === ev) {
			let varName = 'x_'+i;
			eventMap[ev] = varName;
		
			objMap[varName] = 0;
		
			let constraint = {
				name: varName+'_bound',
				vars: [{name: varName, coef: 1}],
				bnds: varBound
			};
			model.subjectTo.push(constraint);
		}
	}
	// Link the non-representative events to their representative event's variables
	for (var i=0; i < ean.events.length; i++) {
		let ev = ean.events[i];
		let repEvent = substMap[ev];
		if (repEvent !== ev) {
			eventMap[ev] = eventMap[repEvent];
		}
	}
	
	let activityMap = {};
	for (var i=0; i < ean.activities.length; i++) {
		let activity = ean.activities[i];
		let fromVar = eventMap[activity.from];
		let toVar = eventMap[activity.to];
		
		// Update objective
		objMap[fromVar] -= activity.weight;
		if (typeof fromVar === 'undefined') {
			console.log('Error here...');
		}
		objMap[toVar] += activity.weight;
		if (typeof toVar === 'undefined') {
			console.log('Error here... '+activity.to);
		}
		objConstant -= activity.lb;
		
		if (activity.lb == 0 && activity.ub == 0) {
			// These activities are already taken care of
			// due to the substitution process
			continue;
		}
		
		let consName = 'c_'+i;
		activityMap[consName] = activity;
		let varList = [
			{name: fromVar, coef: -1},
			{name: toVar, coef: 1}
		];
		if (ean.cyclic_schedule) {
			let yVar = 'y_'+i;
			model.generals.push(yVar);
			varList.push({name: yVar, coef: ean.cyclic_period});

			// Update the objective
			objMap[yVar] = ean.cyclic_period * activity.weight;
		}
		if (ean.allow_infeasible) {
			let slackVarNeg = 'sneg_'+i;
			varList.push({name: slackVarNeg, coef: -1});
			objMap[slackVarNeg] = ean.infeasible_penalty;
			if (typeof slackVarNeg === 'undefined') {
				console.log('Error here...');
			}
			let slackVarPos = 'spos_'+i;
			varList.push({name: slackVarPos, coef: 1});
			objMap[slackVarPos] = ean.infeasible_penalty;
		}
		let bounds = null;
		let lb = Number(activity.lb);
		let ub = Number(activity.ub);
		if (isFinite(lb) && !isNaN(lb) && isFinite(ub) && !isNaN(ub)) {
			if (ean.cyclic_schedule) {
				let lb_tmp = Math.min(ub % ean.cyclic_period, lb % ean.cyclic_period);
				ub = Math.max(ub % ean.cyclic_period, lb % ean.cyclic_period);
				lb = lb_tmp;
			}
			bounds = {type: glpk.GLP_DB, lb: lb, ub: ub};
			if (lb === ub) {
				bounds = {type: glpk.GLP_FX, lb: lb, ub: ub};
			}
		}
		else if (isFinite(lb) && !isNaN(lb)) {
			
			if (ean.cyclic_schedule) {
				bounds = {type: glpk.GLP_LO, lb: lb % ean.cyclic_period};
			}
			else {
				bounds = {type: glpk.GLP_LO, lb: lb};
			}
		}
		else if (isFinite(ub) && !isNaN(ub)){
			if (ean.cyclic_schedule) {
				bounds = {type: glpk_GLP_UP, ub: ub % ean.cyclic_period};
			}
			else {
				bounds = {type: glpk.GLP_UP, ub: ub};
			}
		}
		else {
			console.log('Invalid activity...');
			console.log(activity);
			continue;
		}
		let constraint = {
			name: consName,
			vars: varList,
			bnds: bounds
		}
		model.subjectTo.push(constraint); 
	}

	for (const varName in objMap){
		if (typeof varName !== 'undefined') {
			model.objective.vars.push({name: varName, coef: objMap[varName]});
		}
	}	
	return {model: model, eventMap: eventMap, activityMap: activityMap, objConstant: objConstant};
}

function construct_solution(glpk_solution, model_data) {
	/*
	 * 	private final Map<String,Double> eventTimes;
	private final Double objective;
	private final Double relativeGap;
	private final double solveTime;
	private final boolean feasible;
	private final String error;
	
	                this.glpk_solution.result.z += model_data.objConstant;
                this.glpk_solution.eventMap = model_data.eventMap;
	 */
	console.log(model_data);
	let res = {eventTimes: glpk_solution.eventMap, objective: glpk_solution.result.z, relativeGap: 0, solveTime: glpk_solution.time, feasible: true, error: null};
	for (var event in model_data.eventMap) {
		let varname = glpk_solution.eventMap[event];
		let value = glpk_solution.result.vars[varname];
		res.eventTimes[event] = value;
	}
	return res;
}
