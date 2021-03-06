/* This file is part of Jeedom.
 *
 * Jeedom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Jeedom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Jeedom. If not, see <http://www.gnu.org/licenses/>.
 */

//To memorise page refresh timeout when set
var refreshTimeout;

function callPluginAjax(_params) {
    $.ajax({
        async: _params.async == undefined ? true : _params.async,
        global: false,
        type: "POST",
        url: "plugins/jMQTT/core/ajax/jMQTT.ajax.php",
        data: _params.data,
        dataType: 'json',
        error: function (request, status, error) {
            handleAjaxError(request, status, error);
        },
        success: function (data) { 
            if (data.state != 'ok') {
                $('#div_alert').showAlert({message: data.result, level: 'danger'});
            }
            else {
                if (typeof _params.success === 'function') {
                    _params.success(data.result);
                }
            }
        }
    });
}

// Rebuild the page URL from the current URL
// 
// filter: array of parameters to be removed from the URL
// id:     if not empty, it is appended to the URL (in that case, 'id' should be passed within the filter.
// hash:   if provided, it is appended at the end of the URL (shall contain the # character). If a hash was already 
//         present, it is replaced by that one. 
function initPluginUrl(filter=['id', 'saveSuccessFull','removeSuccessFull', 'hash'], id='', hash='') {
    var vars = getUrlVars();
    var url = 'index.php?';
    for (var i in vars) {
        if ($.inArray(i,filter) < 0) {
            if (url.substr(-1) != '?')
                url += '&';
            url += i + '=' + vars[i].replace('#', '');
        }
    };
    if (id != '') {
        url += '&id=' + id;
    }
    if (document.location.hash != "" && $.inArray('hash',filter) < 0) {
        url += document.location.hash;
    }
    if (hash != '' ) {
        url += hash
    }
    return url;
}

// Function to refresh the page
// Ask confirmation if the page has been modified
function refreshEqLogicPage() {
    function refreshPage() {
        if ($('.eqLogicAttr[data-l1key=id]').value() != "") {
            tab = null
            if (document.location.toString().match('#')) {
                tab = '#' + document.location.toString().split('#')[1];
                if (tab != '#') {
                    tab = $('a[href="' + tab + '"]')
                } else {
                    tab = null
                }
            }      
            $('.eqLogicDisplayCard[data-eqlogic_id="' + $('.eqLogicAttr[data-l1key=id]').value() + '"]').click();
            if (tab) tab.click();
        }
        else {
            $('.eqLogicAction[data-action=returnToThumbnailDisplay]').click();
        }
    }
    //console.log('refreshEqLogicPage: ' + $('.eqLogicAttr[data-l1key=id]').value());
    if (modifyWithoutSave) {
        bootbox.confirm("{{La page a ??t?? modifi??e. Etes-vous s??r de vouloir la recharger sans sauver ?}}", function (result) {
            if (result)
                refreshPage();
        });
    }
    else
        refreshPage();
}

$(document).ready(function() {
    // On page load, show the commandtab menu bar if necessary (fix #64)
    if (document.location.hash == '#commandtab') {
        $('#menu-bar').show();
    }
    
    // Done here, otherwise the refresh button remains selected
    $('.eqLogicAction[data-action=refreshPage]').removeAttr('href').off('click').on('click', function(event) {
        event.stopPropagation();
        refreshEqLogicPage();
    });
});

$("#bt_addMQTTInfo").on('click', function(event) {
    var _cmd = {type: 'info'};
    addCmdToTable(_cmd);
    modifyWithoutSave = true;
});

$("#bt_addMQTTAction").on('click', function(event) {
    var _cmd = {type: 'action'};
    addCmdToTable(_cmd);
    modifyWithoutSave = true;
});

$('.eqLogicAction[data-action=healthMQTT]').on('click', function () {
    $('#md_modal').dialog({title: "{{Sant?? jMQTT}}"});
    $('#md_modal').load('index.php?v=d&plugin=jMQTT&modal=health').dialog('open');
});

$("#table_cmd").delegate(".listEquipementAction", 'click', function() {
    var el = $(this);
    jeedom.cmd.getSelectModal({cmd: {type: 'action'}}, function(result) {
        var calcul = el.closest('tr').find('.cmdAttr[data-l1key=configuration][data-l2key=' + el.attr('data-input') + ']');
        calcul.value(result.human);
    });
});

$("#table_cmd").delegate(".listEquipementInfo", 'click', function () {
    var el = $(this);
    jeedom.cmd.getSelectModal({cmd: {type: 'info'}}, function (result) {
        var calcul = el.closest('tr').find('.cmdAttr[data-l1key=configuration][data-l2key=' + el.data('input') + ']');
        calcul.atCaret('insert', result.human);
        modifyWithoutSave = true
    });
});

$('#bt_classic').on('click', function() {
    refreshEqLogicPage();
    $('#bt_classic').removeClass('btn-default').addClass('btn-primary');
    $('#bt_json').removeClass('btn-primary').addClass('btn-default');
});

$('#bt_json').on('click', function() {
    refreshEqLogicPage();
    $('#bt_json').removeClass('btn-default').addClass('btn-primary');
    $('#bt_classic').removeClass('btn-primary').addClass('btn-default');
});

$('.nav-tabs a[href="#eqlogictab"],.nav-tabs a[href="#brokertab"]').on('click', function() {
    $('#menu-bar').hide();
});

$('.nav-tabs a[href="#commandtab"]').on('click', function() {
    $('#menu-bar').show();
});

// Configure the sortable functionality of the commands array
$("#table_cmd").sortable({axis: "y", cursor: "move", items: ".cmd", placeholder: "ui-state-highlight", tolerance: "intersect", forcePlaceholderSize: true});

/**
 * Add jMQTT equipment callback
 */
$('.eqLogicAction[data-action=add_jmqtt]').on('click', function () {
    if (typeof $(this).attr('brkId') === 'undefined') {
        var eqL = {type: 'broker', brkId: -1};
        var prompt = "{{Nom du broker ?}}"; 
    }
    else {
        var eqL = {type: 'eqpt', brkId: $(this).attr('brkId')};
        var prompt = "{{Nom de l'??quipement ?}}"; 
    }
    bootbox.prompt(prompt, function (result) {
        if (result !== null) {
            jeedom.eqLogic.save({
                type: eqType,
                eqLogics: [ $.extend({name: result}, eqL) ],
                error: function (error) {
                    $('#div_alert').showAlert({message: error.message, level: 'danger'});
                },
                success: function (data) {
                    var url = initPluginUrl();
                    modifyWithoutSave = false;
                    url += '&id=' + data.id + '&saveSuccessFull=1';
                    loadPage(url);
                }
            });
        }
    });
});

$('.eqLogicAction[data-action=remove_jmqtt]').on('click', function () {
    
    function remove_jmqtt() {
        jeedom.eqLogic.remove({
            type: eqType,
            id: $('.eqLogicAttr[data-l1key=id]').value(),
            error: function (error) {
                $('#div_alert').showAlert({message: error.message, level: 'danger'});
            },
            success: function () {
                var url = initPluginUrl();
                modifyWithoutSave = false;
                url += '&removeSuccessFull=1';
                loadPage(url);
            }
        });                                
    }
    
    if ($('.eqLogicAttr[data-l1key=id]').value() != undefined) {
        var typ = $('.eqLogicAttr[data-l2key=type]').value() == 'broker' ? 'broker' : 'module';
        bootbox.confirm('{{Etes-vous s??r de vouloir supprimer}}' + ' ' +
                (typ == 'broker' ? '{{le broker}}' : "{{l'??quipement}}") + ' <b>' + $('.eqLogicAttr[data-l1key=name]').value() + '</b> ?', function (result) {
            if (result) {
                if (typ == 'broker') {
                    bootbox.confirm('<table><tr><td style="vertical-align:middle;font-size:2em;padding-right:10px"><span class="label label-warning"><i class="fa fa-warning"</i>' +
                        '</span></td><td style="vertical-align:middle">' + '{{Tous les ??quipements associ??s au broker vont ??tre supprim??s}}' +
                        '...<br><b>' + '{{??tes vous s??r ?}}' + '</b></td></tr></table>', function (result) {
                        if (result) {
                            remove_jmqtt();
                        }
                    });
                }
                else {
                    remove_jmqtt();
                }
            }
        });
    } else {
        $('#div_alert').showAlert({message: '{{Veuillez d\'abord s??lectionner un}} ' + eqType, level: 'danger'});
    }
});

$('.eqLogicAction[data-action=move_broker]').on('click', function () {
    var id = $('.eqLogicAttr[data-l1key=id]').value();
    var brk_id = $('#broker').val();
    if (id != undefined && brk_id != undefined) {
        bootbox.confirm('<table><tr><td style="vertical-align:middle;font-size:2em;padding-right:10px"><span class="label label-warning"><i class="fa fa-warning"</i>' +
            '</span></td><td style="vertical-align:middle">' + "{{Vous ??tes sur le point de changer l'??quipement de broker}}" +
            '.<br>' + '{{??tes vous s??r ?}}' + '</td></tr></table>', function (result) {
            if (result) {
                callPluginAjax({
                    async: false,
                    data: {
                        action: 'moveToBroker',
                        id: id,
                        brk_id: brk_id
                    },
                    success: function (data) {
                        window.location.reload();
                    }
                });
            }
        });
    }
});

/**
 * printEqLogic callback called by plugin.template before calling addCmdToTable.
 *   . Reorder commands if the JSON view is active
 *   . Show the fields depending on the type (broker or equipment)
 */
function printEqLogic(_eqLogic) {
    
    // Initialize the command counter of the next command to be added
    var n_cmd = 1;
    
    // Is the JSON view is active
    var is_json_view = $('#bt_json.active').length != 0;

    // JSON view button is active
    if (is_json_view) {

        // Compute the ordering string of each commands
        // On JSON view, we completely rebuild the command table
        var new_cmds = new Array();
        
        /**
         * Add a command to the JSON commands tree
         */
        function addCmd(c, parent_id=-1) {
            c.treegrid_id = n_cmd++;
            if (parent_id > 0) {
                c.treegrid_parent_id = parent_id;
            }
            new_cmds.push(c);
        }
        
        /**
         * Check if the topic of the given command is equal to the given topic
         * @return true or false
         */
        function hasTopic(c, topic) {
            return c.configuration.topic == topic;
        }
        
        /**
         * Check if the given command is in the given array
         * @return found command or undefined
         */        
        function inArray(cmds, cmd) {
            return cmds.find(function (c) { return c == cmd });
        }
        
        /**
         * Check if the given topic is in the given array
         * @return found command or undefined
         */        
        function existingCmd(cmds, topic) {
            var exist_cmds = cmds.filter(function (c) { return hasTopic(c, topic); });
            if (exist_cmds.length > 0)
                return exist_cmds[0];
            else
                return undefined;
        }
        
        /**
         * Add the given topic/payload to the command array.
         * If the command already exists, add the existing command. Otherwise create a no name command.
         */
        function addPayload(topic, payload, parent_id) {
            var val = (typeof payload === 'object') ? JSON.stringify(payload) : payload;
            var c =  existingCmd(_eqLogic.cmd, topic);
            //console.log('addPayload: topic=' + topic + ', payload=' + val + ', parent_id=' + parent_id + ', exist=' + (c == undefined ? false : true));
            if (c === undefined) {
                addCmd({
                    configuration: {
                        topic: topic
                    },
                    isHistorized: "0",
                    isVisible: "1",
                    type: 'info',
                    subType: 'string',
                    value: val
                }, parent_id);
            }
            else {
                c.value = val;
                addCmd(c, parent_id);
            }
        }
        
        /**
         * Add to the JSON command tree the given command identified by its topic and JSON payload
         * plus the commands deriving from the JSON payload
         */
        function recursiveAddJsonPayload(topic, payload, parent_id=-1) {
            //console.log('recursiveAddJsonPayload: topic=' + topic + ', payload=' + JSON.stringify(payload));
            addPayload(topic, payload, parent_id);
            var this_id = n_cmd-1;
            for (i in payload) {
                if (typeof payload[i] === 'object') {
                    recursiveAddJsonPayload(topic + '{' + i + '}', payload[i], this_id);
                }
                else {
                    addPayload(topic + '{' + i + '}', payload[i], this_id);
                }
            }
        }

        /**
         * Add commands from their topic
         */
        function recursiveAddCmdFromTopic(topic) {
            //console.log('recursiveAddCmdFromTopic: ' + topic);
            var parent_id = -1;
            
            // For commands deriving from a JSON payload (i.e. topic contains {), start the
            // addition from the father command
            var n = topic.lastIndexOf('{');
            if (n >= 0) {
                father_topic = topic.substring(0, n);
                // Call recursively this method iwth the father topic
                recursiveAddCmdFromTopic(father_topic);
                // We need to get the treegrid id of the father command to be able to add this
                // command to tree in the next step
                var c = existingCmd(new_cmds, father_topic);
                if (c !== undefined)
                    parent_id = c.treegrid_id;
            }
            
            // Add this command to the tree if not previously added
            var c = existingCmd(new_cmds, topic);
            if (c === undefined) {
                c = existingCmd(_eqLogic.cmd, topic);
                if (c !== undefined) {
                    // Get the payload associated to the command
                    jeedom.cmd.execute({
                        async: false, id: c.id, cache: 0, notify: false,
                        success: function(result) {
                            c.value = result;
                        }});
                    try {
                        var parsed_json_value = JSON.parse(c.value);
                    }
                    catch (e) {}
                    
                    // Add the command: in case of JSON payload, call recursiveAddJsonPayload to add
                    // also the derived commands
                    if (typeof parsed_json_value === 'object') {
                        recursiveAddJsonPayload(c.configuration.topic, parsed_json_value, parent_id);
                    }
                    else {
                        addCmd(c, parent_id);
                    }
                }
            }
        }
        
        // Main loop on the existing command: objective is to add to the JSON command tree all the
        // existing commands plus the commands that can be created from JSON payloads
        for (var c of _eqLogic.cmd) {
            if (!inArray(new_cmds, c)) {
                if (c.type == 'info') {
                    //console.log('loop: add info ' + c.configuration.topic);
                    recursiveAddCmdFromTopic(c.configuration.topic);
                }
                else {
                    // Action commands are added directly
                    addCmd(c);
                }
            }
        }
        
        _eqLogic.cmd = new_cmds;

        // JSON view: disable the sortable functionality
        $("#table_cmd").sortable('disable');
    }
    else {
        for (var c of _eqLogic.cmd) {
            c.treegrid_id = n_cmd++;
        }
        
        // Classical view: enable the sortable functionality
        $("#table_cmd").sortable('enable');
    }

    // Show UI elements depending on the type
    if (_eqLogic.configuration.brkId == undefined || _eqLogic.configuration.brkId < 0 ||
            (_eqLogic.configuration.type != 'eqpt' && _eqLogic.configuration.type != 'broker')) {
        $('.toDisable').addClass('disabled');
        $('.typ-brk').hide();
        $('.typ-std').show();
    }
    else if (_eqLogic.configuration.type == 'broker') {
        $('.toDisable').removeClass('disabled');
        $('.typ-std').hide();
        $('.typ-brk').show();
        $('#mqtttopic').prop('readonly', true);
        var log = 'jMQTT_' + (_eqLogic.name.replace(' ', '_') || 'jeedom');
        $('input[name=rd_logupdate]').attr('data-l1key', 'log::level::' + log);
        $('.bt_plugin_conf_view_log').attr('data-log', log);
        $('.bt_plugin_conf_view_log').html('<i class="fa fa fa-file-text-o"></i> ' + log);
        
        refreshDaemonInfo();
        
        jeedom.config.load({
            configuration: $('#div_broker_log').getValues('.configKey')[0],
            plugin: 'jMQTT',
            error: function (error) {
                $('#div_alert').showAlert({message: error.message, level: 'danger'});
            },
            success: function (data) {
              $('#div_broker_log').setValues(data, '.configKey');
            }
          });
    }
    else if (_eqLogic.configuration.type == 'eqpt') {
        $('.toDisable').removeClass('disabled');
        $('.typ-brk').hide();
        $('.typ-std').show();
        $('#mqtttopic').prop('readonly', false);
    }
    
    // Initialise the broker dropbox
    var brokers = $("#broker");
    brokers.empty();
    $.each( eqBrokers, function(key, name) {
        brokers.append(new Option(name, key));
    });
    brokers.val(_eqLogic.configuration.brkId);
}

/**
 * saveEqLogic callback called by plugin.template before saving an eqLogic
 */
function saveEqLogic(_eqLogic) {

    // pass the log level when defined (i.e. for a broker object)
    var log_level = $('#div_broker_log').getValues('.configKey')[0];
    if (!$.isEmptyObject(log_level)) {
        _eqLogic.loglevel =  log_level;
    }
    
    // remove non existing commands added for the JSON view and add new commands at the end
    //var max_order = Math.max.apply(Math, _eqLogic.cmd.map(function(cmd) { return cmd.order; }));    
    for(var i = _eqLogic.cmd.length - 1; i >= 0; i--) {
        if (_eqLogic.cmd[i].id == "" && _eqLogic.cmd[i].name == "") {
            _eqLogic.cmd.splice(i, 1);
        }
    }
    
    return _eqLogic;
}

/**
 * addCmdToTable callback called by plugin.template: render eqLogic commands
 */
function addCmdToTable(_cmd) {
    if (!isset(_cmd)) {
        var _cmd = {configuration: {}};
    }
    if (!isset(_cmd.configuration)) {
        _cmd.configuration = {};
    }

    // Is the JSON view is active
    var is_json_view = $('#bt_json.active').length != 0;

    if (init(_cmd.type) == 'info') {
        // FIXME: is this disabled variable usefull?
        var disabled = (init(_cmd.configuration.virtualAction) == '1') ? 'disabled' : '';
       
        var tr = '<tr class="cmd treegrid-' + _cmd.treegrid_id;
        if (is_json_view) {
            if (_cmd.treegrid_parent_id > 0) {
                tr += ' treegrid-parent-' + _cmd.treegrid_parent_id;
            }
        }
        tr += '" data-cmd_id="' + init(_cmd.id) + '">';
        tr += '<td class="fitwidth"><span class="cmdAttr" data-l1key="id"></span>';

        // TRICK: For the JSON view include the "order" value in a hidden element
        // so that the original/natural order is kept when saving
        if (is_json_view) {
            tr += '<span style="display:none;" class="cmdAttr" data-l1key="order"></span></td>';
        }
        else {
            tr += '</td>';
        }

        tr += '<td><textarea class="cmdAttr form-control input-sm" data-l1key="name" style="height:65px;" placeholder="{{Nom de l\'info}}" /></textarea></td>';
        tr += '<td>';
        tr += '<input class="cmdAttr form-control type input-sm" data-l1key="type" value="info" disabled style="margin-bottom:5px;width:120px;" />';
        tr += '<span class="cmdAttr subType" subType="' + init(_cmd.subType) + '"></span>';
        tr += '</td><td>';
        tr += '<textarea class="cmdAttr form-control input-sm" data-l1key="configuration" data-l2key="topic" style="height:65px;" ' + disabled + ' placeholder="{{Topic}}"/></textarea>';
        tr += '</td><td>';
        tr += '<textarea class="form-control input-sm" data-key="value" style="height:65px;" ' + disabled + ' placeholder="{{Valeur}}" readonly=true /></textarea>';
        tr += '</td><td class="fitwidth">';
        tr += '<input class="cmdAttr form-control input-sm" data-l1key="unite" placeholder="{{Unit??}}"></td><td>';        
        if (is_numeric(_cmd.id)) {
            tr += '<span><label class="checkbox-inline"><input type="checkbox" class="cmdAttr checkbox-inline" data-l1key="isHistorized" checked/>{{Historiser}}</label></span> ';
            tr += '<span><label class="checkbox-inline"><input type="checkbox" class="cmdAttr checkbox-inline" data-l1key="isVisible" checked/>{{Afficher}}</label></span> ';
            tr += '<span><label class="checkbox-inline"><input type="checkbox" class="cmdAttr checkbox-inline" data-l1key="display" data-l2key="invertBinary"/>{{Inverser}}</label></span> ';
            tr += '</td><td>';
            tr += '<a class="btn btn-default btn-xs cmdAction" data-action="configure"><i class="fas fa-cogs"></i></a> ';
            tr += '<a class="btn btn-default btn-xs cmdAction" data-action="test"><i class="fas fa-rss"></i> {{Tester}}</a>';
        }
        else {
            tr += '</td><td>';
        }
        if (_cmd.id != undefined && _cmd.configuration.irremovable == undefined) {
            tr += ' <a class="btn btn-default btn-xs cmdAction pull-right" data-action="remove"><i class="fas fa-minus-circle"></i></a>';
        }
        tr += '</td></tr>';

        $('#table_cmd tbody').append(tr);
        $('#table_cmd tbody tr:last').setValues(_cmd, '.cmdAttr');
        if (isset(_cmd.type)) {
            $('#table_cmd tbody tr:last .cmdAttr[data-l1key=type]').value(init(_cmd.type));
        }
        jeedom.cmd.changeType($('#table_cmd tbody tr:last'), init(_cmd.subType));

        function refreshValue(val) {
            $('.treegrid-' + _cmd.treegrid_id + ' .form-control[data-key=value]').value(val);
        }

        // Display the value. Efficient in JSON view only as _cmd.value was set in JSON view only in printEqLogic.
        // See below for CLASSIC view.
        refreshValue(_cmd.value);
        
        if (_cmd.id != undefined) {
            // Get and display the value in CLASSIC view (for JSON view, see few lines above)
            if (! is_json_view) {
                jeedom.cmd.execute({
                    id: _cmd.id,
                    cache: 0,
                    notify: false,
                    success: function(result) {
                        refreshValue(result);
                }});
            }
            
            // Set the update value callback
            jeedom.cmd.update[_cmd.id] = function(_options) {
                refreshValue(_options.display_value);
            }
        }
    }

    if (init(_cmd.type) == 'action') {
        var tr = '<tr class="cmd treegrid-' +  _cmd.treegrid_id + '" data-cmd_id="' + init(_cmd.id) + '">';
        tr += '<td>';
        tr += '<span class="cmdAttr" data-l1key="id"></span>';
        tr += '</td>';
        tr += '<td>';
        tr += '<div class="row">';
        tr += '<div class="col-sm-4">';
        tr += '<a class="cmdAction btn btn-default btn-sm" data-l1key="chooseIcon" style="padding-left:5px;padding-right:5px;"><i class="fa fa-flag"></i>  Ic??ne</a>';
        tr += '<span class="cmdAttr" data-l1key="display" data-l2key="icon" style="margin-left:5px;"></span>';
        tr += '</div>';
        tr += '<div class="col-sm-8">';
        tr += '<input class="cmdAttr form-control input-sm" data-l1key="name">';
        tr += '</div>';
        tr += '</div>';
        tr += '<select class="cmdAttr form-control tooltips input-sm" data-l1key="value" style="display:none;margin-top:5px;margin-right:10px;" title="{{Valeur par d??faut de la commande}}">';
        tr += '<option value="">Aucune</option>';
        tr += '</select>';
        tr += '</td>';
        tr += '<td>';
        tr += '<input class="cmdAttr form-control type input-sm" data-l1key="type" value="action" disabled style="margin-bottom:5px;width:120px;" />';
        tr += '<span class="cmdAttr subType" subType="' + init(_cmd.subType) + '" style=""></span>';
        tr += '</td>';
        tr += '<td>';
        tr += '<textarea class="cmdAttr form-control input-sm" data-l1key="configuration" data-l2key="topic" style="height:65px;"' + disabled + ' placeholder="{{Topic}}"></textarea><br/>';
        tr += '</td><td>';
        tr += '<textarea class="cmdAttr form-control input-sm" data-l1key="configuration" data-l2key="request" style="height:30px;" ' + disabled + ' placeholder="{{Valeur}}"></textarea>';
        tr += '<a class="btn btn-default btn-sm cursor listEquipementInfo" data-input="request" style="margin-top:5px;margin-left:5px;"><i class="fa fa-list-alt "></i> {{Rechercher ??quipement}}</a>';
        tr +='</select></span>';
        tr += '</td><td></td><td>';
        tr += '<span><label class="checkbox-inline"><input type="checkbox" class="cmdAttr checkbox-inline" data-l1key="isVisible" checked/>{{Afficher}}</label></span><br> ';
        tr += '<span><label class="checkbox-inline"><input type="checkbox" class="cmdAttr checkbox-inline" data-l1key="configuration" data-l2key="retain"/>{{Retain}}</label></span><br> ';
        tr += '<span class="checkbox-inline">{{Qos}}: <input class="tooltips cmdAttr form-control input-sm" data-l1key="configuration" data-l2key="Qos" placeholder="{{Qos}}" title="{{Qos}}" style="width:50px;display:inline-block;"></span> ';
        tr += '</td>';
        tr += '<td>';
        if (is_numeric(_cmd.id)) {
            tr += '<a class="btn btn-default btn-xs cmdAction expertModeVisible" data-action="configure"><i class="fa fa-cogs"></i></a> ';
            tr += '<a class="btn btn-default btn-xs cmdAction" data-action="test"><i class="fa fa-rss"></i> {{Tester}}</a>';
        }
        tr += '<a class="btn btn-default btn-xs cmdAction pull-right" data-action="remove"><i class="fa fa-minus-circle"></i></a></td>';
        tr += '</tr>';
        
        $('#table_cmd tbody').append(tr);
        // $('#table_cmd tbody tr:last').setValues(_cmd, '.cmdAttr');
        var tr = $('#table_cmd tbody tr:last');
        jeedom.eqLogic.builSelectCmd({
            id: $('.eqLogicAttr[data-l1key=id]').value(),
            filter: {type: 'info'},
            error: function (error) {
                $('#div_alert').showAlert({message: error.message, level: 'danger'});
            },
            success: function (result) {
                tr.find('.cmdAttr[data-l1key=value]').append(result);
                tr.setValues(_cmd, '.cmdAttr');
                jeedom.cmd.changeType(tr, init(_cmd.subType));
            }
        });
    }

    // If JSON view is active, build the tree
    if (is_json_view) {
        $('.tree').treegrid({
            initialState: 'expanded',
            expanderExpandedClass: 'fas fa-minus',
            expanderCollapsedClass: 'fas fa-plus'
        });
    }
}

/**
 * Management of cmdTopicMismatch event sent by the plugin core
 * @param _event string event name
 * @param _options['eqlogic_name'] string name of the eqLogic command is added to
 * @param _options['cmd_name'] string name of the new command
 */
$('body').off('jMQTT::cmdTopicMismatch').on('jMQTT::cmdTopicMismatch', function(_event,_options) {
    if ($('#div_cmdMsg').is(':empty') || $('#div_cmdMsg').is(':hidden'))
        var msg = '{{La commande}} <b>' + _options['cmd_name'] + "</b> {{a un topic incompatible du topic d'inscription de l\'??quipement}}" +
        ' <b>' + _options['eqlogic_name'] + '</b>.';
    else
        var msg = "{{Plusieurs commandes ont des topics incompatibles du topic d'inscription de l\'??quipement}} <b>" + _options['eqlogic_name'] + '</b>.';
    
    $('#div_cmdMsg').showAlert({message: msg, level: 'warning'});
});


/**
 * Management of the display when an information command is added
 * Triggerred when the plugin core send a jMQTT::cmdAdded event
 * @param _event string event name
 * @param _options['eqlogic_name'] string name of the eqLogic command is added to
 * @param _options['eqlogic_id'] int id of the eqLogic command is added to
 * @param _options['cmd_name'] string name of the new command
 * @param _options['reload'] bool whether or not a reload of the page is requested
 */
$('body').off('jMQTT::cmdAdded').on('jMQTT::cmdAdded', function(_event,_options) {
    if ($('#div_cmdMsg').is(':empty') || $('#div_cmdMsg').is(':hidden'))
        var msg = '{{La commande}} <b>' + _options['cmd_name'] + '</b> {{est ajout??e ?? l\'??quipement}}' +
        ' <b>' + _options['eqlogic_name'] + '</b>.';
    else
        var msg = '{{Plusieurs commandes sont ajout??es ?? l\'??quipement}} <b>' + _options['eqlogic_name'] + '</b>.';

    // If the page is being modified or another equipment is being consulted or a dialog box is shown: display a simple alert message
    if (modifyWithoutSave || ( $('.eqLogic').is(":visible") && $('.eqLogicAttr[data-l1key=id]').value() != _options['eqlogic_id'] ) ||
            $('div[role="dialog"]').filter(':visible').length != 0 || !_options['reload']) {
        $('#div_cmdMsg').showAlert({message: msg, level: 'warning'});
    }
    // Otherwise: display an alert message and reload the page
    else {
        $('#div_cmdMsg').showAlert({
            message: msg + ' {{La page va se r??actualiser automatiquement}}.',
            level: 'warning'
        });
        // Reload the page after a delay to let the user read the message
        if (refreshTimeout === undefined) {
            refreshTimeout = setTimeout(function() {
                refreshTimeout = undefined;
                $('.eqLogicAction[data-action=refreshPage]').click();
            }, 3000);
        }
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Management of the include button and mode
//

// Configure the display according to the given mode
//If given mode is not provided, use the bt_changeIncludeMode data-mode attribute value
function configureIncludeModeDisplay(brkId, mode) {
    if (mode == 1) {
        //$('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+']:not(.card)').removeClass('btn-default').addClass('btn-success');
        $('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+']').attr('data-mode', 1);
        $('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+'].card span').text('{{Arr??ter l\'inclusion}}');
        $('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+']').addClass('include');
        $('#div_inclusionModeMsg').showAlert({message: '{{Mode inclusion automatique pendant 2 ?? 3min. Cliquez sur le bouton pour forcer la sortie de ce mode avant.}}', level: 'warning'});
    } else {
        //$('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+']:not(.card)').addClass('btn-default').removeClass('btn-success btn-danger');
        $('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+']').attr('data-mode', 0);
        $('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+'].card span').text('{{Mode inclusion}}');
        $('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+']').removeClass('include');
        $('#div_inclusionModeMsg').hideAlert();
    }
}

function setIncludeModeActivation(brkId, broker_state) {
    if (broker_state == "ok") {
        $('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+']').removeClass('disableCard').on('click', changeIncludeMode);
    }
    else {
        $('.eqLogicAction[data-action=changeIncludeMode][brkId='+brkId+']').addClass('disableCard').unbind();;
    }
}

function changeIncludeMode() {
    var el = $(this);

    // Invert the button display and show the alert message
    if (el.attr('data-mode') == 1) {
        configureIncludeModeDisplay(el.attr('brkId'),0);
    }
    else {
        configureIncludeModeDisplay(el.attr('brkId'),1);
    }

    // Ajax call to inform the plugin core of the change   
    callPluginAjax({
        data: {
            action: "changeIncludeMode",
            mode: el.attr('data-mode'),
            id: el.attr('brkId')
        }
    });    
}

// Update the broker icon and the include mode activation on reception of a new state event
$('body').off('jMQTT::EventState').on('jMQTT::EventState', function (_event,_options) {
    showDaemonInfo(_options);
    setIncludeModeActivation(_options.brkId, _options.state);
    $('.eqLogicDisplayCard[jmqtt_type="broker"][data-eqlogic_id="' + _options.brkId + '"] img').attr('src', 'plugins/jMQTT/resources/images/node_broker_' + _options.state + '.svg');
});

//Called by the plugin core to inform about the automatic inclusion mode disabling
$('body').off('jMQTT::disableIncludeMode').on('jMQTT::disableIncludeMode', function (_event,_options) {
    // Change display accordingly
    configureIncludeModeDisplay(_options['brkId'], 0);
});

/**
 * Called by the plugin core to inform about the inclusion of an equipment
 *
 * @param {string} _event event name (jMQTT::eqptAdded in this context)
 * @param {string} _options['eqlogic_name'] string name of the eqLogic command is added to
 */
$('body').off('jMQTT::eqptAdded').on('jMQTT::eqptAdded', function (_event,_options) {

    var msg = '{{L\'??quipement}} <b>' + _options['eqlogic_name'] + '</b> {{vient d\'??tre inclu}}';

    // If the page is being modified or an equipment is being consulted or a dialog box is shown: display a simple alert message
    // Otherwise: display an alert message and reload the page
    if (modifyWithoutSave || $('.eqLogic').is(":visible") || $('div[role="dialog"]').filter(':visible').length != 0) {
        $('#div_newEqptMsg').showAlert({message: msg + '.', level: 'warning'});
    }
    else {
        $('#div_newEqptMsg').showAlert({
            message: msg + '. {{La page va se r??actualiser automatiquement}}.',
            level: 'warning'
        });
        // Reload the page after a delay to let the user read the message
        if (refreshTimeout === undefined) {
            refreshTimeout = setTimeout(function() {
                refreshTimeout = undefined;
                window.location.reload();
            }, 3000);
        }
    }
});