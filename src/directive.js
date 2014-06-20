angular.module('pivotdash.directives',[])


.directive('datepicker', function () {
		return {
			require: 'ngModel',
			link: function (scope, el, attr, ngModel) {
				el.datepicker({
					changeMonth: true,
					changeYear: true,
					yearRange: '-100:+0',
					dateFormat: 'dd-MM-yy',
					//minDate: (new Date(1900, 1 - 1, 26)), 
					// maxDate: (new Date()),
					onSelect: function (dateText) {
						scope.$apply(function () {
							ngModel.$setViewValue(dateText);
						});
					}
				});
			}
		};
	})

