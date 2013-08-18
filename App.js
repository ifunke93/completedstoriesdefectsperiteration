Ext.define('Rally.apps.completedstoriesanddefectsperiteration.CompletedStoriesAndDefectsPerIterationApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'completedstoriesanddefectsperiteration',
    scopeType: 'iteration',

    comboboxConfig: {
        fieldLabel: 'Select Iteration:',
        labelWidth: 100,
        width: 300
    },

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

        this._loadStores();
    },

    onScopeChange: function() {
        this._loadStores();
    },

    _loadStores: function() {
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'UserStory',
            autoLoad: true,
            fetch: ['_ref', 'FormattedID', 'Name', 'ScheduleState', 'Owner'],
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

    _onStoriesStoreLoaded: function(store, data) {
        var hide = false, title;
        if (data.length === 0) {
            hide = true;
            title = 'No Stories in Iteration';
        } else {
            title = 'Stories: ' + data.length;
        }
        this.down('#story-title').update(title);

        if (this.storyGrid) {
            this.storyGrid.destroy();
        }

        this.storyGrid = this._createCustomGrid(store, hide, '#storyComponents');
    },

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
    },

    _createCustomGrid: function(store, hide, container) {
        var me = this;
        grid = this.down(container).add({
            xtype: 'rallygrid',
            store: store,
            hidden: hide,
            sortableColumns: false,
            columnCfgs: [
                {text: 'Artifact', flex: 4, renderer: function(value, metaData, record) {
                    return '<a href="' + Rally.nav.Manager.getDetailUrl(record.get('_ref')) + '"><b>' +
                        record.get('FormattedID') + ' ' + record.get('Name') + '</b></a></div>';
                }},
                {text: 'Status', dataIndex: 'ScheduleState', flex: 1},
                {text: 'Owner',  flex: 1, renderer: function(value, metaData, record) {
                    return record.get('Owner')._refObjectName;
                }}
            ]
        });

        return grid;
    }


});
