var URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQny4aobPl0WBH4qnx8jQSmaBQp_hpldR998M9Ojkf_t2TFGHkkhH-zt3hhnpH65RV8QNDSPZC5YpFd/pub?gid=879140185&single=true&output=csv'

d3.csv(URL, function (error, data) {
    //1. load data and throw error if there is one
    if (error) throw error;

    //2. define reset and draw functions

    //default to location - declare variables, reset_data and draw charts
    var search_opt = 'type';
    var options_list = [];
    var all_options = true;


    function generate_id() {
        //charcodes - 0-9 are 48-57, A-Z are 65-90
    }

    function draw_list(search_opt, options_list, all_options) {
        //dynamically draws the list_radio checkboxes
        //1. Set the list title and sort the options_list
        document.getElementById('list_title').innerHTML = search_opt.toUpperCase() + " <i>(Cliquez pour filtrer)</i>";
        options_list.sort();

        //2. get distinct values of search_opt from data
        //dynamically create radio button with none selected
        radio_string = "";
        for (i = 0; i < options_list.length; i++) {
            radio_string += "<br><input type='checkbox' id='" + options_list[i];
            radio_string += "' name='options' value='" + options_list[i];
            radio_string += "'><label for='" + options_list[i] + "'>" + options_list[i];
            radio_string += "</label><br>";
        }
        document.getElementById('list_radio').innerHTML = radio_string;

        //set the on_change event to redraw charts whenever a checkbox option is selected
        d3.selectAll('input[name="options"]')
            .on('change', function () {
                //return a list of 'selected' checkboxes or none if there are none
                all_options = options_selected();
                //redraw charts according to selections
                new_draw_map(data, options_list, search_opt, all_options)

            })

    }

    function reset_data() {
        //creates a set of distinct 'option' values dependent on search_opt
        //used to populate list_radio
        var options_set = d3.set();
        var my_val = "";

        data.forEach(function (d) {
            //if a long string, only shows the first 20 characters
            my_val = check_length(d[search_opt], 20);
            options_set.add(my_val);
        });
        options_list = options_set.values()
    }

    function check_length(my_val, len_no) {

        //ensures a string is only as long as len_no and adds .. after to
        //indicate string has been cropped
        if (my_val.length > len_no) {
            my_val = my_val.slice(0, len_no) + ".."
        }
        return my_val;
    }

    function options_selected() {

        //looks at dynamically drawn options and adds any 'checked' values to the list
        var checked = document.querySelectorAll('input[name="options"]:checked');
        checked = Array.prototype.slice.call(checked);
        my_list = [];

        if (checked.length === 0) {
            // there are no checked checkboxes
        } else {
            // there are some checked checkboxes
            checked.forEach(function (d) {
                my_list.push(d.id)
            })
        }
        return my_list;

    }

    function draw_charts() {
        //draws the charts (functions in effective_plots.js)
        draw_list(search_opt, options_list);
        new_draw_map(data, options_list, search_opt)
    }


    //set on_change event for search option
    d3.selectAll('input[name="search_option"]')
        .on('change', function () {
            //reset the global var search_opt
            search_opt = document.querySelector('input[name="search_option"]:checked').value;
            //reset data and draw charts
            reset_data();
            draw_charts()
        });

    reset_data();
    draw_charts();


    function apply_filters(data, search_opt, filter_by) {
        //used by both bars, line and donut
        //filters the data by values in filter_by if a filtering list exists

        if (filter_by === undefined) {
            filter_by = []
        }

        if (filter_by.length > 0) {
            my_data = data.filter(function (d) {
                d[search_opt] = check_length(d[search_opt], 20);
                return filter_by.indexOf(d[search_opt]) > -1;
            });
        } else {
            my_data = data;
        }
        return my_data;

    }


    function new_draw_map(data, options_list, search_opt, filter_by) {

        //1. Set the list title
        //document.getElementById('map_title').innerHTML = "Map for selected " + search_opt.toUpperCase();

        //2. Apply filters
        my_data = apply_filters(data, search_opt, filter_by);

        var bound = new google.maps.LatLngBounds();
        for (m in my_data) {
            long = +my_data[m].longitude;
            lat = +my_data[m].latitude;
            if (isNaN(my_data[m].longitude)) {
                my_data.splice(m, 1)
            } else {
                bound.extend(new google.maps.LatLng(lat, long));
            }
        }
        var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

        d3.selectAll('#map')
            .attr("width", width - 200);

        // Create the Google Map w/o poi
        var map = new google.maps.Map(d3.select("#map").node(), {
            zoom: 1,
            center: new google.maps.LatLng(-25.363, 131.044),
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
                {featureType: 'poi', stylers: [{ visibility: "off" }]}]
        });


        map.fitBounds(bound);

        var overlay = new google.maps.OverlayView();

        // Add the container when the overlay is added to the map.
        overlay.onAdd = function () {
            var layer = d3.select(this.getPanes().overlayMouseTarget).append("div")
                .attr("class", "effective");

            // Draw each marker as a separate SVG element.
            // We could use a single SVG, but what size would it have?
            overlay.draw = function () {
                var projection = this.getProjection(),
                    padding = 10;


                var tooltip = d3.select("body")
                    .append("div")
                    .attr("class", "tooltip_map")
                    .html("");

                var marker = layer.selectAll("svg")
                    .data(my_data)
                    .each(transform) // update existing markers
                    .enter().append("svg")
                    .each(transform)
                    .attr("class", "marker");


                // Add a circle.
                marker.append("circle")
                    .attr("r", 4)
                    .attr("cx", padding + 5)
                    .attr("cy", padding + 5)
                    .on("mouseover", function (d) {
                        //sets tooltip.  t_text = content in html
                        tooltip.style("visibility", "hidden");
                        t_text = "Nom: " + d.nom + "<br>Adresse: " + d.adresse + "<br>Type: " + d.type + "<br>Terrasse: " + d.terrasse + "<br>Note Yelp: " + d.noteyelp + "<br>Prix Yelp: " + d.prixyelp
                        tooltip.html(t_text);
                        d3.select(this).style("cursor", "pointer");
                        tooltip.style("visibility", "visible");
                        tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
                    })
                    .on("mousemove", function () {

                    })
                    .on("mouseout", function () {
                        d3.select(this).style("cursor", "default");


                    })
                    .on("click", function(){

                    });

                function transform(d) {
                    d = new google.maps.LatLng(+d.latitude, +d.longitude);
                    d = projection.fromLatLngToDivPixel(d);
                    return d3.select(this)
                        .style("left", (d.x - padding) + "px")
                        .style("top", (d.y - padding) + "px");
                }
            };
        };

        // Bind our overlay to the map
        overlay.setMap(map);


    }


});