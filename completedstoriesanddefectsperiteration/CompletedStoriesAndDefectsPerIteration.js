(function() {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('Rally.apps.completedstoriesanddefectsperiteration.CompletedStoriesAndDefectsPerIterationApp', {
        extend: 'Rally.app.TimeboxScopedApp',
        componentCls: 'completedstoriesanddefectsperiteration',
        requires: ['Rally.ui.grid.Grid'],
        alias: 'widget.completedstoriesanddefectsperiteration',
        scopeType: 'iteration',

        comboboxConfig: {
            fieldLabel: 'Select Iteration:',
            labelWidth: 100,
            width: 300
        },

        // add the initial elements to app
        addContent: function() {
            this.add({
                xtype: 'container',
                itemId: 'mainHeader',
                componentCls: 'mainHeader',
                items: [{
                    xtype: 'label',
                    itemId: 'completed-label',
                    text: 'Completed Items',
                    componentCls: 'completed-header'
                }]
            }, {
                xtype: 'container',
                itemId: 'storyComponents',
                componentCls: 'components',
                items: [{
                    xtype: 'label',
                    itemId: 'story-title',
                    text: 'No Stories in Iteration',
                    componentCls: 'gridTitle'
                }]
            }, {
                xtype: 'container',
                itemId: 'defectComponents',
                componentCls: 'components',
                items: [{
                    xtype: 'label',
                    itemId: 'defect-title',
                    text: 'No Defects in Iteration',
                    componentCls: 'gridTitle'
                }]
            });

            this._onLoad();
        },

        onScopeChange: function() {
            this._onLoad();
        },

        // load the stores for the Defects and the User Stories
        _onLoad: function() {
            Ext.create('Rally.data.WsapiDataStore', {
                model: 'UserStory',
                autoLoad: true,
                fetch: ['_ref', 'FormattedID', 'Name', 'ScheduleState', 'Owner', 'Defects'],
                filters: [
                    this.getContext().getTimeboxScope().getQueryFilter(),
                    {
                        property: 'ScheduleState',
                        operator: '=',
                        value: 'Completed'
                    }
                ],
                sorters: [{
                    property: 'FormattedID',
                    direction: 'ASC'
                }],
                listeners: {
                    load: this._onStoriesStoreLoaded,
                    scope: this
                }
            });

            Ext.create('Rally.data.WsapiDataStore', {
                model: 'Defect',
                autoLoad: true,
                fetch: ['_ref', 'FormattedID', 'Name', 'Owner', 'ScheduleState'],
                filters: [
                    this.getContext().getTimeboxScope().getQueryFilter(),
                    {
                        property: 'ScheduleState',
                        operator: '=',
                        value: 'Completed'
                    }
                ],
                sorters: [{
                    property: 'FormattedID',
                    direction: 'ASC'
                }],
                listeners: {
                    load: this._onDefectsStoreLoaded,
                    scope: this
                }
            });
        },

        // called when the User Stories are loaded, fetches the corresponding defects
        _onStoriesStoreLoaded: function(store, data) {
            this._storyRecords = [];
            var defectList = [];
            var numberTimesLoaded = data.length;
            var counter = 0;
            if (data.length === 0) {
                this._onStoriesDataLoaded([],0);
            }
            Ext.Array.each(data, function (story, index) {
                this._storyRecords.push({
                    FormattedID: story.get('FormattedID'),
                    _ref: story.get('_ref'),
                    Name: story.get('Name'),
                    ScheduleState: story.get('ScheduleState'),
                    Owner: story.get('Owner'),
                    Class: 'parent'
                });

                story.getCollection('Defects').load({
                    fetch: ['FormattedID', 'Name', 'ScheduleState', 'Owner', '_ref'],
                    scope: this,
                    callback: function(defects, operation, success) {
                        counter++;
                        defectList = defectList.concat(this._getDefects(defects, story));
                        if (counter === numberTimesLoaded) {
                            this._onStoriesDataLoaded(defectList, data.length);
                        }
                    }
                });
            }, this);
        },

        // gets the correct Defects for the Story and formats them correctly
        _getDefects: function(defects, story) {
            var defectList = [];
            for (var i = 0; i < defects.length; i++) {
                defectList.push({
                    matchedFormattedID: story.get('FormattedID'),
                    _ref: defects[i].get('_ref'),
                    Name: defects[i].get('Name'),
                    ScheduleState: defects[i].get('ScheduleState'),
                    Owner: defects[i].get('Owner'),
                    FormattedID: defects[i].get('FormattedID'),
                    Class: 'child'
                });
            }

            return defectList;
        },

        // gets the data to build the grid
        _onStoriesDataLoaded: function(defects, length) {
            var formattedData = this._formatData(defects, this._storyRecords);
            this._buildStories(formattedData, length);
        },

        // formats the data, so the rows are in the correct order
        _formatData: function(defects, data) {
            var defectID, tempDefectList = [];
            for (var i = 0; i < defects.length; i++) {
                defectID = defects[i].matchedFormattedID;
                for (var j = i; j < defects.length; j++) {
                    if (defects[j].matchedFormattedID === defectID) {
                        Ext.Array.insert(tempDefectList, j+1, [defects[j]]);
                        i++;
                    }
                }
                for (var r = 0; r < data.length; r++) {
                    if (data[r].FormattedID === defectID) {
                        Ext.Array.insert(data, r+1, tempDefectList);
                        break;
                    }
                }
                tempDefectList = [];
                i--;
            }

            return data;
        
        },

        // builds the Story grid
        _buildStories: function(data, length) {
            var hide = false, title;
            if (data.length === 0) {
                hide = true;
                title = 'No Stories in Iteration';
            } else {
                title = 'Stories: ' + length;
            }
            this.down('#story-title').update(title);

            var customStore = this._createCustomStore(data, hide);

            if (this.storyGrid) {
                this.storyGrid.destroy();
            }

            this.storyGrid = this._createCustomGrid(customStore, hide, '#storyComponents');

            this._storiesReady = true;
            this._fireReady();
        },

        // makes a store from the data given
        _createCustomStore: function(data, hide) {
            store = Ext.create('Rally.data.custom.Store', {
                hidden: hide,
                data: data,
                pageSize: data.length
            });
            return store;
        },

        // creates the grid from the Defect store
        _onDefectsStoreLoaded: function(store, data) {
            var hide = false, title;
            if (data.length === 0) {
                hide = true;
                title = 'No Defects in Iteration';
            } else {
                title = 'Defects: ' + data.length;
            }
            this.down('#defect-title').update(title);

            if (this.defectGrid) {
                this.defectGrid.destroy();
            }

            this.defectGrid = this._createCustomGrid(store, hide, '#defectComponents');

            this._defectsReady = true;
            this._fireReady();
        },

        // creates a grid from the given store
        _createCustomGrid: function(store, hide, container) {
            var me = this;
            var grid = this.down(container).add({
                xtype: 'rallygrid',
                store: store,
                hidden: hide,
                showRowActionColumn: false,
                columnCfgs: [
                    {text: 'Artifact', flex: 4, renderer: this._artifactRenderer},
                    {text: 'Status', flex: 1, renderer: this._statusRenderer},
                    {text: 'Owner',  flex: 1, renderer: function(value, metaData, record) {
                        return me._ownerRenderer(record);
                    }}
                ]
            });

            return grid;
        },

        // renders the text in the Artifact field of the grid
        _artifactRenderer: function(value, metaData, record) {
            var className = record.get('Class');
            if (!className) {
                className = 'parent';
            }
            return '<div class="' + className + '"><a href="' + Rally.nav.Manager.getDetailUrl(record.get('_ref')) + 
                '" target="_top">' + record.get('FormattedID') + ' ' + record.get('Name') + '</a></div>';
        },

        // renders the text in the Status field of the grid
        _statusRenderer: function(value, metaData, record) {
            if (record.get('Class') === 'parent' || !record.get('Class')) {
                return '<div class="parent">' + record.get('ScheduleState') + '</div>';
            }
            return record.get('ScheduleState');
        },

        // renders the text in the Owner field of the grid
        _ownerRenderer: function(record) {
            if (record.get('Class') === 'parent' || !record.get('Class')) {
                return '<div class="parent">' + this._ownerIfKnown(record.get('Owner')) + '</div>';
            }
            return this._ownerIfKnown(record.get('Owner'));
        },

        // returns the Owner name if known, and 'unknown' otherwise
        _ownerIfKnown: function (owner) {
            return (owner && owner._refObjectName) || 'unknown';
        },

        _fireReady: function() {
            if (Rally.BrowserTest && this._storiesReady && this._defectsReady && !this._readyFired) {
                this._readyFired = true;
                Rally.BrowserTest.publishComponentReady(this);
            }
        }


    });
})();
