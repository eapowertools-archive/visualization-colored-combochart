define(["jquery", "./js/d3.min", "./js/d3-tip", "text!./colouredcombochart.css", "qlik"],
	function ($, d3, d3tip, cssContent, qlik) {
		'use strict';

		$("<style>").html(cssContent).appendTo("head");

		//console.log("tooltip lib: ");
		//console.log(d3tip);
		d3tip.init(d3);

		var data;

		function makeSelection(backendApi, dim) {
			backendApi.selectValues(0, [dim[0].qElemNumber], true);
		}

		function initContainer($element, layout, className) {
			var ext_height = $element.height();
			var ext_width = $element.width();
			var id = "ext_" + layout.qInfo.qId;

			// Initialize or clear out the container and its classes
			if (!document.getElementById(id)) {
				$element.append($("<div />").attr("id", id));
			} else {
				$("#" + id)
					.empty()
					.removeClass();
			}

			// Set the containers properties like width, height, and class
			$("#" + id)
				.width(ext_width)
				.height(ext_height)
				.addClass(className);

			return id;
		}

		function viz($element, layout, backendApi, barColourFunc) {
			var data = layout.qHyperCube.qDataPages[0].qMatrix;

			var useSingleAxis = true;
			if (layout.qHyperCube.qMeasureInfo[1].series.axis == 1) {
				useSingleAxis = false;
			}

			var id = initContainer($element, layout, "colouredcombochart");
			var ext_width = $element.width();
			var ext_height = $element.height();



			var margin = {
				top: 0,
				right: useSingleAxis ? 0 : 60,
				bottom: 60,
				left: 60
			};
			var width = ext_width - margin.left - margin.right;
			var height = ext_height - margin.top - margin.bottom;

			var x = d3.scaleBand().rangeRound([0, width]).padding(0.25);
			var y = d3.scaleLinear().rangeRound([height, 0]);
			var y2 = d3.scaleLinear().rangeRound([height, 0]);

			var svg = d3.select("#" + id).append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom);

			var g = svg.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			x.domain(data.map(function (d) {
				return d[0].qText;
			}));


			var measure1Max = d3.max(data, function (d) {
				return d[1].qNum;
			});
			var measure2Max = d3.max(data, function (d) {
				return d[2].qNum;
			});
			if (useSingleAxis) {


				y.domain([0, d3.max([measure1Max, measure2Max]) * 1.05]);
			} else {
				y.domain([0, measure1Max * 1.05]);
				y2.domain([0, measure2Max * 1.05]);
			}

			var scaledFontSize = (Math.floor(height / 150) + 10) + "px";

			// X Axis
			g.append("g")
				.attr("class", "axis axis--x")
				.attr("transform", "translate(0," + height + ")")
				.style("font-size", scaledFontSize)
				.call(d3.axisBottom(x).tickSizeInner(0).tickSizeOuter(0));
			g.append("text")
				.attr("transform",
					"translate(" + (width / 2) + " ," +
					(height + (margin.bottom * .75)) + ")")
				.style("text-anchor", "middle")
				.style("font-size", scaledFontSize)
				.text(layout.qHyperCube.qDimensionInfo[0].qFallbackTitle);



			// Y Axis
			var measureLabel1 = layout.qHyperCube.qMeasureInfo[0].qFallbackTitle;
			var measureLabel2 = layout.qHyperCube.qMeasureInfo[1].qFallbackTitle;
			var numberOfTicks = Math.floor((height / 100) * 1.5);
			g.append("g")
				.attr("class", "axis axis--y")
				.style("font-size", scaledFontSize)
				.call(d3.axisLeft(y).ticks(numberOfTicks, "s").tickSizeOuter(0).tickSizeInner(10))
			g.append("text")
				.attr("transform",
					"rotate(-90),translate(" + -((height + margin.bottom) / 2) + "," +
					-(margin.left * .7) + ")")
				.style("text-anchor", "middle")
				.style("font-size", scaledFontSize)
				.text(useSingleAxis ? measureLabel1 + ", " + measureLabel2 : measureLabel1);

			if (!useSingleAxis) {
				g.append("g")
					.attr("class", "axis axis--y")
					.attr("transform", "translate(" + width + ",0)")
					.style("font-size", scaledFontSize)
					.call(d3.axisRight(y2).ticks(numberOfTicks, "s").tickSizeOuter(0).tickSizeInner(10))

				g.append("text")
					.attr("transform",
						"rotate(90),translate(" + (height + margin.bottom) / 2 + "," + -(width + (margin.right) * .7) + ")")
					.style("text-anchor", "middle")
					.style("font-size", scaledFontSize)
					.text(measureLabel2);
			}



			// Add grid line
			g.append("g")
				.attr("class", "grid axis--y")
				.call(d3.axisRight(y).ticks(numberOfTicks, "s").tickSizeInner(width).tickSizeOuter(width));

			// Tooltip
			var tip = d3.tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function (d) {
					return "<strong>&nbsp;&nbsp;" + d[0].qText + "</strong><br/>" +
						measureLabel1 + ':' + +(Math.round(d[1].qNum + "e+2") + "e-2") + "<br/>" +
						measureLabel2 + ':' + +(Math.round(d[2].qNum + "e+2") + "e-2");
				});
			g.call(tip);



			var selectionMethodCall = function (d) {
				makeSelection(backendApi, d);
			};

			// Bars
			g.selectAll(".bar")
				.data(data)
				.enter().append("rect")
				.attr("class", "bar")
				.attr("fill", barColourFunc)
				.attr("x", function (d) {
					return x(d[0].qText);
				})
				.attr("y", function (d) {
					return y(d[1].qNum);
				})
				.attr("width", x.bandwidth())
				.attr("height", function (d) {
					return height - y(d[1].qNum);
				})
				.on('mouseover', function (d) {
					tip.show(d);
					$(".bar").on("mouseleave", function () {
						tip.hide();
					});

				})
				.on("click", function (d) {
					tip.hide();
					selectionMethodCall(d);
				});


			// Line
			var line = d3.line()
				.x(function (d) {
					return x(d[0].qText);
				})
				.y(function (d) {
					if (useSingleAxis) {
						return y(d[2].qNum);
					} else {
						return y2(d[2].qNum);
					}
				});

			var lineColour = layout.lineColour;
			if (lineColour == undefined || lineColour == '')
			{
				lineColour = "#4477AA";
			}
			g.append("path")
				.datum(data)
				.attr("class", "line")
				.style("stroke", lineColour)
				.attr("transform",
					"translate(" + x.bandwidth() / 2 + ",0)")
				.attr("d", line);
		}

		function getBarColoursThenDraw($element, layout, backendApi) {
			var app = qlik.currApp(this);

			if (layout.barColours == undefined || layout.barColours == '') {
				var colourFunc = function (d) {
					return "#4477AA"
				};

				return viz($element, layout, backendApi, colourFunc);
			}

			app.createCube({
				qDimensions: [{
					qDef: {
						qFieldDefs: [layout.qHyperCube.qDimensionInfo[0].qFallbackTitle]
					}
				}],
				qMeasures: [{
					qDef: {
						qDef: layout.barColours
					}
				}],
				qInitialDataFetch: [{
					qTop: 0,
					qLeft: 0,
					qHeight: 20,
					qWidth: 3
				}]
			}, function (response) {
				var colourMatrix = response.qHyperCube.qDataPages[0].qMatrix;
				var colourFunc = function (d) {
					var colourMatch = colourMatrix.filter(function (colour) {
						return colour[0].qText == d[0].qText
					});
					return colourMatch[0][1].qText;
				};
				viz($element, layout, backendApi, colourFunc);
			});
		}

		return {
			initialProperties: {
				version: 1.0,
				qHyperCubeDef: {
					qDimensions: [],
					qMeasures: [],
					qInitialDataFetch: [{
						qWidth: 6,
						qHeight: 1500
					}],
					qSuppressMissing: true
				}
			},
			definition: {
				type: "items",
				component: "accordion",
				items: {
					data: {
						uses: "data",
						items: {
							dimensions: {
								min: 1,
								max: 1,
							},
							measures: {
								min: 2,
								max: 2,
								items: {
									seriesAxis: {
										ref: "qDef.series.axis",
										type: "integer",
										component: "dropdown",
										defaultValue: 0,
										options: [{
											translation: "properties.axis.primary",
											value: 0
										}, {
											translation: "properties.axis.secondary",
											value: 1
										}],
										show: function (data, handler) {
											if (handler.layout.qHyperCube.qMeasureInfo[1].cId == data.qDef.cId) {
												return true;
											}
											return false;
										}
									}
								}
							}
						}
					},
					sorting: {
						uses: "sorting"
					},
					settings: {
						uses: "settings",
						items: {
							barSegmentColorsInput: {
								type: "string",
								component: "expression",
								label: "Bar Colors",
								ref: "barColours",
								expression: ""
							},

							lineColourInput: {
								type: "string",
								label: "Line Colour",
								ref: "lineColour",
								expression: "optional"
							}
						}
					}
				}
			},
			snapshot: {
				canTakeSnapshot: true
			},
			paint: function ($element, layout) {
				var backendApi = this.backendApi;

				getBarColoursThenDraw($element, layout, backendApi)


			},
			resize: function ($el, layout) {
				this.paint($el, layout);
			}
		};

	}

);