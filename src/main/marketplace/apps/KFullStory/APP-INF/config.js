var APP_NAME = 'KFullStory';
var DB_NAME = 'KFullStory';
var DB_TITLE = 'KFullStory';
var dbType = 'json';

var recordMapping = {
    "properties": {
        "recordName": {
            "type": "text",
            "store": true
        },
        "session": {
            "type": "keyword",
            "store": true,
            "fields": {
                "text": {
                    "type": "text"
                }
            }
        },
        "userId": {
            "type": "integer",
            "store": true
        },
        "savedDate": {
            "type": "date",
            "store": true
        }
    }
}

var DB_MAPPINGS = {
    record: recordMapping
};

var JSON_DB = '/jsondb';

var TYPE_RECORD = 'record';
