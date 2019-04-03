const DEFAULT_DWELL = 1;

Vue.component('line-dialog', {
  data: function () {
    return {
      origin: "stop1",
      stops: [{drive: 5, stop: "stop2", dwell: DEFAULT_DWELL}],
      both_ways: true,
      counter: 2,
      line_count: 1,
      line_name: "l1"
    }
  },
  methods: {
	addStop: function() {
		this.stops.push({drive: 5, stop: "stop"+(++this.counter), dwell: DEFAULT_DWELL});
	},
	deleteStop: function(idx) {
		this.stops.splice(idx,1);
	},
	reset: function() {
		this.stops = [{drive: 5, stop: "stop2", dwell: DEFAULT_DWELL}];
		this.origin = "stop1";
		this.counter = 2;
		this.line_name = "l"+this.line_count;
	},
	done: function() {
		this.$emit('done', {origin: this.origin, stops: this.stops, both_ways: this.both_ways, name: this.line_name});
		this.line_count++;
		this.reset();

	}
  },
  template: `
  			<div class="modal" tabindex="-1" role="dialog">
				<div class="modal-dialog" role="document">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title">Add Line</h5>
							<button type="button" class="close" data-dismiss="modal"
								aria-label="Close" v-on:click="reset()">
								<span aria-hidden="true">&times;</span>
							</button>
						</div>
						<div class="modal-body">
							 <div>
	  		<ul class="list-group list-group-flush">
	  			<li class="list-group-item">
	  				<div class="input-group">
	  					<div class="input-group-prepend input-group-text" style="width: 10em;">Stop</div>
	  					<input type="text" v-model="origin" class="form-control">
	  				</div>
	  			</li>
	  			<li class="list-group-item" v-for="(stop,index) in stops">
	  				<div class="input-group">
	  					<div class="input-group-prepend input-group-text" style="width: 10em;">Driving time</div>
	  					<input type="number" min="0" v-model="stop.drive" class="form-control">
	  				</div>
	  				<div class="input-group">
	  					<div class="input-group-prepend input-group-text" style="width: 10em;">Stop</div>
	  					<input type="text" v-model="stop.stop" class="form-control" v-on:input="update()">
	  					<div class="input-group-append"><button class="btn btn-danger" :disabled="stops.length <= 1" v-on:click="deleteStop(index);">X</button></div>
	  				</div>
	  			    <div class="input-group" v-if="index < stops.length - 1">
	  					<div class="input-group-prepend input-group-text" style="width: 10em;">Dwell time</div>
	  					<input type="number" min="0" v-model="stop.dwell" class="form-control">
	  				</div>
	  			</li>
	  		</ul>
	  		<br />
	  		<button class="btn btn-primary btn-block" v-on:click="addStop();">Add Stop</button>
	  		<br />
	  						<div class="input-group">
								<div class="input-group-text input-group-prepend" style="width: 100%"> <input type="checkbox" v-model="both_ways">
								&nbsp The line is operated in both ways</div>							
							</div>
	  							  				<br />
	  				<div class="input-group">
	  					<div class="input-group-prepend"><span class="input-group-text">Name of Line</span></div>
	  					<input class="form-control" type="text" v-model="line_name">
	  				</div>

	  		</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-primary" v-on:click="done()" data-dismiss="modal">Add Line</button>
							<button type="button" class="btn btn-secondary"
								data-dismiss="modal" v-on:click="reset()">Cancel</button>
						</div>
					</div>
				</div>
			</div>
  `
})