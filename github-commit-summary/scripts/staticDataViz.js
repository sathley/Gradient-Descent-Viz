$(function(){
    $("body").width(window.innerWidth).height(window.innerHeight);
    var genereator = new graphGenerator();

    var settings = {
        collaboratorToCompare: window.dataStore.authors[0].id,
        maxCollaborators: 10
    };

    var select = $("#vizForm select");
    var maxCollaborator = $("#vizForm input");

    window.dataStore.authors.forEach(function(d){
        select.append("<option value='" + d.id + "' " + (settings.collaboratorToCompare === d.id ? "selected='selected'" : "") + ">" + d.id + "</option>");
    });

    maxCollaborator.val(settings.maxCollaborators);

    $("#update-settings").on("click", function(){
        settings.maxCollaborators = Math.min(Math.max(maxCollaborator.val(), 3), 100);
        maxCollaborator.val(settings.maxCollaborators);
        settings.collaboratorToCompare = select.val();
        genereator.generate(window.dataStore.processedData, settings);
    });

    $("#update-settings").trigger("click")
});

function graphGenerator(){
    var margins = 50,
        diameter = Math.min(window.innerWidth, window.innerHeight) - (2 * margins),
        outerRadius = diameter / 2,
        innerRadius = outerRadius - 160;

    var pie = d3.layout.pie()
        .sort(null)
        .padAngle(.01)
        .value(function(d) {
            return 1;
        });

    var linearScale = d3.scale.linear();

    var logScale = d3.scale.log();

    var bundle = d3.layout.bundle();

    var edgeBundles = d3.svg.line.radial()
        .interpolate("bundle")
        .tension(.95)
        .radius(function(d) {
            return d.radius;
        })
        .angle(function(d) {
            return d.angle;
        });

    var line = d3.svg.line.radial().interpolate("cardinal");
    var area = d3.svg.area.radial().interpolate("cardinal");

    var arc = d3.svg.arc();

    var svg = d3.select("#contributor-chart")
        .attr("width", diameter + (2 * margins))
        .attr("height", diameter + (2 * margins))
            .append("g")
            .attr("transform", "translate(" + (outerRadius + margins) + "," + (outerRadius + margins) + ")")
            .append("g");


    var d3ContributorNodes = svg.selectAll(".contributor");
        svg.append("g").attr("class", "links");


    this.generate = function(contributorEvents, settings) {
        var weekOnly = true;
        var slicedInput = contributorEvents.slice(0, settings.maxCollaborators);
        var author = slicedInput.find(function(d){ return d.author === settings.collaboratorToCompare;})

        if (!author) {
            slicedInput.pop();
            author = contributorEvents.find(function(d){ return d.author === settings.collaboratorToCompare;});
            slicedInput.unshift(author);
        }

        var nodes = getEventNodes({name: "root", children: slicedInput}, 0, true);

        var maxWeekEvent = 0, maxCommit = 0, maxAddition = 0, maxDeletion = 0;

        var contributorNodesData = nodes.filter(function(d){ return d.depth === 1; });

        svg.transition().duration(1500)
            .attr("transform", "rotate(" + (-author.angle * (180/Math.PI)) + ")");


        var weekNodesData = nodes.filter(function(d){
                if (d.depth === 2){
                    maxWeekEvent = Math.max(maxWeekEvent, d.singleActors + d.doubleActors);
                    maxCommit = Math.max(d.commits, maxCommit);
                    maxAddition = Math.max(d.additions, maxAddition);
                    maxDeletion = Math.max(d.deletions, maxDeletion);
                    return true;
                }
                return false;
            });

        var eventNodesData = nodes.filter(function(d){ return d.depth === 3; });

        /**** Contributor ****/
        arc.innerRadius(innerRadius).outerRadius(outerRadius);

        d3ContributorNodes = d3ContributorNodes.data(contributorNodesData, function(d){
            return d.author;
        });

        var d3ContributorNodesEnter = d3ContributorNodes.enter()
                .append("g")
                .attr("class", "contributor");

        d3ContributorNodesEnter
                .append("path")
                .attr("class", "contributorBG")
                .attr("id", function(d){
                    return d.author + "contributorBorder"
                });

        d3ContributorNodesEnter.append("path").attr("class", "commitBG");

        d3ContributorNodesEnter.append("text")
            .attr("class", "authors")
            .attr("dy", -10)
            .append("textPath")
            .attr("xlink:href", function(d){
                return "#" + d.author + "contributorBorder"
            });

        d3ContributorNodes.selectAll("text").selectAll("textPath")
            .attr("startOffset", function(d){
                return (d.angle - d.startAngle) * outerRadius;
            })
            .text(function(d){
                return d.author.substring(0,Math.round((d.endAngle - d.startAngle) * outerRadius / 10));
            });

        d3ContributorNodes.selectAll(".contributorBG")
                .attr("class", function(d){
                    return "contributorBG" + (d.author === settings.collaboratorToCompare? " comparing" : "");
                })
                .transition()
                .duration(750)
                .style("stroke-width", function(d){
                    return 106 * d.padAngle;
                })
                .attr("d", arc);

        d3ContributorNodes.exit().remove();
        /**** Contributor ****/


        /**** Contributor Commits/Additions/Deletions ****/
        logScale.domain([1, maxDeletion]).range([innerRadius + 75, innerRadius + 45]);
        d3ContributorNodesEnter.append("path").attr("class", "deletions");
        d3ContributorNodes.selectAll(".deletions")
            .transition().duration(750)
            .attr("d", function(d){
                var perAngle = (d.endAngle - d.startAngle - d.padAngle)/d.weeks.length;
                var halfAngle = perAngle/2;
                var startAngle = d.startAngle + halfAngle + d.padAngle/2;

                area.innerRadius(function(week, i){
                    return logScale(1);
                }).outerRadius(function(week, i){
                    return logScale(week.deletions + 1);
                }).angle(function(week, i){
                    return startAngle + (perAngle * i);
                });

                return area(d.weeks);
            });

        logScale.domain([1, maxAddition]).range([innerRadius + 75, innerRadius + 105]);
        d3ContributorNodesEnter.append("path").attr("class", "additions");
        d3ContributorNodes.selectAll(".additions")
            .transition().duration(750)
            .attr("d", function(d){
                var perAngle = (d.endAngle - d.startAngle - d.padAngle)/d.weeks.length;
                var halfAngle = perAngle/2;
                var startAngle = d.startAngle + halfAngle + d.padAngle/2;

                area.innerRadius(function(week, i){
                    return logScale(1);
                }).outerRadius(function(week, i){
                    return logScale(week.additions + 1);
                }).angle(function(week, i){
                    return startAngle + (perAngle * i);
                });

                return area(d.weeks);
            });

        logScale.domain([1, maxCommit]).range([innerRadius + 120, innerRadius + 150]);
        arc.innerRadius(innerRadius + 110).outerRadius(innerRadius + 160);
        d3ContributorNodes.selectAll(".commitBG")
            .attr("d", arc);
        d3ContributorNodesEnter.append("path").attr("class", "commits");
        d3ContributorNodes.selectAll(".commits")
            .transition().duration(750)
            .attr("d", function(d){
                var perAngle = (d.endAngle - d.startAngle - d.padAngle)/d.weeks.length;
                var halfAngle = perAngle/2;
                var startAngle = d.startAngle + halfAngle + d.padAngle/2;

                line.radius(function(week, i){
                    return logScale(week.commits + 1);
                }).angle(function(week, i){
                    return startAngle + (perAngle * i);
                });

                return line(d.weeks);
            });
        /**** Contributor Commits/Additions/Deletions ****/


        /**** Week Events ****/
        logScale.domain([1, maxWeekEvent]).range([innerRadius, innerRadius + 40]);

        var d3WeekNodes = d3ContributorNodes.selectAll(".weekNode").data(function(d){
            return d.children;
        }, function(d){
            return d.parent.author + d.week;
        });

        d3WeekNodes
                .enter().append("g")
                .attr("class", "weekNode")
                .each(function(d, i){
                    var week = d3.select(this);

                    if (d.doubleActors > 0){
                        week.append("path")
                            .attr("class", "doubleActors weeklyEvent");
                    }

                    if (d.singleActors > 0) {
                        week.append("path")
                            .attr("class", "singleActors weeklyEvent");
                    }

                    week.append("path")
                        .attr("class", "noWeekEvent weeklyEvent");
                });

        d3WeekNodes
            .each(function(d, i){
                var week = d3.select(this);

                var lower = logScale(1);
                if (d.doubleActors > 0){
                    week.select(".doubleActors").transition().duration(750)
                        .attr("d", arc.innerRadius(lower).outerRadius(lower = logScale(d.doubleActors + 1)));
                }

                if (d.singleActors > 0) {
                    week.select(".singleActors").transition().duration(750)
                        .attr("d", arc.innerRadius(lower).outerRadius(lower = logScale(d.doubleActors + d.singleActors + 1)));
                }

                week.select(".noWeekEvent").transition().duration(750)
                    .attr("d", arc.innerRadius(lower).outerRadius(logScale(maxWeekEvent)));
            });

        d3WeekNodes.exit().remove();
        /**** Week Events ****/


        /**** Week Event Links ****/
        var d3EventLinks = svg.select(".links").selectAll(".eventLink")
            .data(bundle(getLinks(nodes, weekOnly)), function(d){
                d.source = d[0], d.target = d[d.length - 1];
                return d.source.parent.author + " " + d.target.parent.author + " " + (d.source[weekOnly ? "week" : "timestamp"]);
            });

        d3EventLinks.enter()
            .append("path")
            .attr("class", "eventLink");

        d3EventLinks
            .transition().duration(750)
            .attr("stroke", "url(#linear)")
            .style("stroke-width", function(d){
                return (d.source.endAngle - d.source.startAngle) * 100;
            })
            .attr("d", edgeBundles);

        d3EventLinks.exit().remove();
        /**** Week Event Links ****/


        d3ContributorNodes.on("mouseover", function(d){
            var text = d3.select(this).selectAll("text");
            text.select("textPath").remove("textPath");
            text
                .attr("transform", "rotate(" + (d.angle * 180 / Math.PI) + ")")
                .attr("y", -(outerRadius + 20))
                .text(function(d){
                    return d.author;
                });
        }).on("mouseout", function(d){
            var text = d3.select(this).selectAll("text");
            text.text(null);
            text.attr("transform", null)
                .attr("y", null)
            text.attr("dy", -10)
                .append("textPath")
                .attr("xlink:href", "#" + d.author + "contributorBorder")
                .attr("startOffset", (d.angle - d.startAngle) * outerRadius)
                .text(d.author.substring(0,Math.round((d.endAngle - d.startAngle) * outerRadius / 10)));
        });
    }

    function getEventNodes(tree, depth, weekOnly){
        var nodes = [tree];

        tree.depth = depth;

        if(depth === 0) {
            tree.radius = 0;
            tree.angle = 0;
        } else if (depth === 1){
            tree.angle = (tree.startAngle + tree.endAngle)/2;
            tree.radius = weekOnly ? (innerRadius/2) : innerRadius;
        } else if (depth === 2 || depth === 3) {
            tree.angle = (tree.startAngle + tree.endAngle)/2;
            tree.radius = weekOnly ? innerRadius : outerRadius + 20;
        }

        if (tree.children != null && typeof tree.children === "string") {
            tree.children = tree[tree.children];
        }

        if (tree.children != null && tree.children.length === 0) {
            delete tree.children;
        }

        if (tree.children != null){
            var startAngle = tree.startAngle || 0;
            var endAngle = tree.endAngle || (2 * Math.PI);
            var padAngle = 0.03 * (endAngle - startAngle)/tree.children.length;

            if (depth === 0) {
                pie.startAngle(0).endAngle(2 * Math.PI).padAngle(padAngle);
                tree.children = pie(tree.children);
            } else if (depth === 1) {
                pie.startAngle(tree.startAngle + tree.padAngle).endAngle(tree.endAngle - tree.padAngle).padAngle(padAngle);
                tree.children = pie(tree.children);
            } else if (depth === 2) {
                if (weekOnly) {
                    pie.startAngle(tree.parent.startAngle + tree.padAngle).endAngle(tree.parent.endAngle - tree.padAngle).padAngle(padAngle);
                } else {
                    pie.startAngle(tree.parent.startAngle - (Math.PI/4)).endAngle(tree.parent.endAngle + (Math.PI/4)).padAngle(padAngle);
                }
                tree.children = pie(tree.children);
            }

            for(var i=0; i < tree.children.length; i++) {
                if (tree.children[i].data != null) {
                    tree.children[i].data.startAngle = tree.children[i].startAngle;
                    tree.children[i].data.endAngle = tree.children[i].endAngle;
                    tree.children[i].data.padAngle = tree.children[i].padAngle;
                    tree.children[i] = tree.children[i].data;
                }

                tree.children[i].parent = tree;
                nodes = nodes.concat(getEventNodes(tree.children[i], depth + 1, weekOnly));
            }
        }
        return nodes;
    }

    function getLinks(nodes, weekOnly) {
        var fNodes = nodes.filter(function(d){return d.depth === 3 && d.category === "doubleActor" && d.assignee == null && d.to == null;});
        var links = [];
        fNodes.forEach(function(node){
            var source = node.parent.parent.parent;
            source = source.children.find(function(contributor){ return contributor.author === (node.from || node.assigner); });
            if (source != null) {
                source = source.children.find(function(week){ return week.week === node.parent.week; });
                // if (weekOnly !== true && source != null) {
                //     source = source.children.find(function(event){ return event.timestamp === node.timestamp && (node.from || node.assigner) === (event.to || event.assignee); });
                // }
            }

            if (source != null){
                links.push({source: source, target: (weekOnly === true ? node.parent : node)});
            }
        });
        return links;
    }
}

























