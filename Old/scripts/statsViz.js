$(function() {
    $("body").height(window.innerHeight).width(window.innerWidth);

    settings = {
        repoOwner: "tensorflow",
        repoName: "tensorflow",
        maxCollaborators: 10,
        maxNumberOfSegments: 12,
        weeksInSegments: 4,
        bandedSticksEnabled: true,
        cacheEnabled: true
    };

    var contributorChart = contributorStats(settings);

    $("#vizForm :input").each(function(i, d){
        input = $(d);
        if (input.attr("type") == "checkbox") {
            input.prop("checked", settings[input.attr("name")]);
        } else {
            input.val(settings[input.attr("name")]);
        }
    });

    $('#update-settings').on('click', function() {
        $("#vizForm input").each(function(i, d){
            input = $(d);
            if (input.attr("type") == "checkbox") {
                settings[input.attr("name")] = input.prop("checked");
            } else {
                settings[input.attr("name")] = isNaN(input.val()) ? input.val() : parseInt(input.val());
            }
        });

        getProcessedData(settings).then(contributorChart.update);
    });
    getProcessedData(settings).then(contributorChart.update);
});

function contributorStats(settings) {
    var repoName = settings.repoName;
    var width = $("#vizContainer").width(),
        height = window.innerHeight,

    chartRadius = Math.min(width, height) / 2.5;
    chartInnerRadius = chartRadius/6;
    radiusDelta = chartRadius - chartInnerRadius;

    chart = d3.select("#contributor-chart");
    chart.attr("width", width).attr("height", height);

    var opacity = d3.scale.linear().range([0.05,1]);
    var additionScale = d3.scale.linear().range([1, chartInnerRadius/2]);
    var deletionScale = d3.scale.linear().range([1, chartInnerRadius/2]);
    var angleScale = d3.scale.linear();


    var pie = d3.layout.pie()
        .sort(null)
        .padAngle(.01)
        .value(function(d) {
            return 1;
        });

    var d3AngleScale = d3.scale.linear();

    function angleScale(startAngle, endAngle, domain, side){
        var midAngle = (startAngle + endAngle)/2;
        d3AngleScale.domain(domain)
        if (side > 0) {
            d3AngleScale.range([midAngle, endAngle]);
        } else {
            d3AngleScale.range([startAngle, midAngle]);
        }

        return d3AngleScale;
    }

    var contributorArcs = d3.svg.arc()
            .innerRadius(function(d, i){
                return chartRadius + 10;
            })
            .outerRadius(function(d, i) {
                return chartRadius + 20;
            });

    var commitColor = function(type){
        return type == "additions" ? "#59de1d" : "#ec4f1f";
    }

    var arc = d3.svg.arc();
    var color = null;

    this.update = function(processedData) {
        if (repoName != settings.repoName || color == null) {
            color = d3.scale.category20();
            repoName = settings.repoName;
        }

        pieWidth = radiusDelta / settings.maxNumberOfSegments;

        opacity.domain([0, processedData.maxCommits]);
        additionScale.domain([0, processedData.maxAdditions]);
        deletionScale.domain([0, processedData.maxDeletions]);
        angleScale.domain([0, settings.maxNumberOfSegments]);

        arc.innerRadius(function(d, i){
                return chartInnerRadius + (radiusDelta * i / settings.maxNumberOfSegments);
            })
            .outerRadius(function(d, i) {
                return chartInnerRadius + (radiusDelta * i / settings.maxNumberOfSegments) + pieWidth;
            });

        processedData.data = pie(processedData.data);

        var donut = chart.selectAll('.repoCommits')
                    .data(function(){
                        processedData.data.forEach(function(d){
                            d.data.weeks.forEach(function(week){
                                $.extend(week, d);
                            });
                        });
                        return processedData.data;
                    }, function(d){
                        return d.data.author.login;
                    });

        donut.enter().append("svg:g")
            .attr("class", "repoCommits")
            .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")")
                .append("svg:path")
                .attr("class", "contributor")
                .style('fill', function(d, i){
                    return color(d.data.author.login);
                })
                .attr('d', contributorArcs);

        donut.exit().remove();

        var paths = chart.selectAll('.repoCommits')
            .selectAll('.commits')
            .data(function(d, i) {
                return d.data.weeks;
            }, function(d,i){
                return settings.repoName + "_" + d.data.author.login + "_" + i;
            });

        paths.enter()
            .append('svg:path')
            .attr("class", "commits");

        paths
            .transition()
            .duration(500)
            .style('fill', "#000000")
            .style('fill-opacity', function(d, i){
                return opacity(d.totalCommits);
            })
            .attr('d', arc);

        paths.exit().remove();

        if (settings.bandedSticksEnabled) {
            var angle = d3.scale.linear();
                // .range([0, 2 * Math.PI]);
            var radius = d3.scale.linear();
                // .range([innerRadius, outerRadius]);

            var line = d3.svg.line.radial()
                .interpolate("cardinal-closed")
                .angle(function(d) { return angle(d.time); })
                .radius(function(d) { return radius(d.y0 + d.y); });


            var bandedSticks = chart.selectAll('.repoCommits')
                .selectAll('.commitSticks')
                .data(function(d, i) {
                    return d.data.weeks;
                }, function(d,i){
                    return settings.repoName + "_" + d.data.author.login + "_" + i;
                });

            bandedSticks.enter()
                .append('path')
                .attr("class", "commitSticks")
                .attr("transform", function(d, i){
                    // angleScale.range([d.startAngle, d.endAngle]);
                    radius = chartInnerRadius + (radiusDelta * i / settings.maxNumberOfSegments) + (pieWidth/2);
                    meanAngle = (d.startAngle + d.endAngle)/2;
                    x = Math.sin(meanAngle) * radius;
                    y = Math.cos(meanAngle) * radius;
                    return "translate(" + x + "," + y + ")";
                })
                .each(function(d, i){
                    container = d3.select(this);
                    container.append("rect")
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("width", 10)
                        .attr("height", deletionScale(d.deletions))
                        .attr("fill", commitColor("deletions"));

                    container.append("rect")
                        .attr("x", 0)
                        .attr("y", -additionScale(d.additions))
                        .attr("width", 10)
                        .attr("height", additionScale(d.additions))
                        .attr("fill", commitColor("additions"));
                });

            bandedSticks.exit().remove();
        } else {
            chart.selectAll('.repoCommits').selectAll('.commitSticks').remove();
        }

        var legends = d3.select("#legends").selectAll(".legend")
            .data(processedData.data, function(d){
                return d.data.author.login;
            });

        legends.enter().append("div")
            .attr("class", "legend")
            .each(function(d, i){
                container = d3.select(this);
                container = container.append("a")
                    .attr("href", d.data.author.html_url)
                    .attr("target", "_blank");

                container.append("div")
                    .attr("class", "palette")
                    .style("background-color", color(d.data.author.login))
                    .text(" ");

                container.append("div")
                    .attr("class", "description")
                    .text(d.data.author.login);
            });

        legends.exit().remove();
    }

    return this;
}

