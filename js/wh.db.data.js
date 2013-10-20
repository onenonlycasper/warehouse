dbData = [{
    name: 'Template',
    schema:
        'CREATE TABLE "Template" (\
            "id"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
            "name"  TEXT NOT NULL ON CONFLICT ABORT,\
            "desc"  TEXT\
        );'
}, {
    name: 'Card',
    schema:
        'CREATE TABLE "Card" (\
            "id"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
            "name"  TEXT NOT NULL ON CONFLICT ABORT,\
            "desc"  TEXT,\
            "id_template"  INTEGER NOT NULL ON CONFLICT ABORT,\
            CONSTRAINT "fk_id_template" FOREIGN KEY ("id_template") REFERENCES "Template" ("id") ON DELETE RESTRICT ON UPDATE CASCADE\
        );'
}, {
    name: 'Tag',
    schema:
        'CREATE TABLE "Tag" (\
            "id"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
            "name"  TEXT NOT NULL ON CONFLICT ABORT,\
            "desc"  TEXT\
        );',
    query: 'INSERT INTO "Tag" (id, name) VALUES (?, ?);',
    data: [[0, 'No Tags']]
}, {
    name: 'Card_Tag',
    schema:
        'CREATE TABLE "Card_Tag" (\
            "id"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
            "id_card"  INTEGER NOT NULL ON CONFLICT ABORT,\
            "id_tag"  INTEGER NOT NULL ON CONFLICT ABORT,\
            CONSTRAINT "fk_id_card" FOREIGN KEY ("id_card") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,\
            CONSTRAINT "fk_id_tag" FOREIGN KEY ("id_tag") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE\
        );'
}, {
    name: 'Type',
    schema:
        'CREATE TABLE "Type" (\
            "id"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
            "name"  TEXT NOT NULL ON CONFLICT ABORT,\
            "order"  INTEGER NOT NULL ON CONFLICT ABORT\
        );',
    query: 'INSERT INTO "Type" (id, name, "order") VALUES (?, ?, ?);',
    data: [
        [1, 'String', 1],
        [2, 'Text', 2],
        [3, 'URL', 3],
        [4, 'Password', 4],
        [5, 'Date', 5],
        [6, 'Select', 6]
    ]
}, {
    name: 'Field',
    schema:
        'CREATE TABLE "Field" (\
            "id"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
            "name"  TEXT NOT NULL ON CONFLICT ABORT,\
            "extra"  TEXT,\
            "order"  INTEGER NOT NULL ON CONFLICT ABORT,\
            "id_type"  INTEGER NOT NULL ON CONFLICT ABORT,\
            "id_template"  INTEGER NOT NULL ON CONFLICT ABORT,\
            CONSTRAINT "fk_id_type" FOREIGN KEY ("id_type") REFERENCES "Type" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,\
            CONSTRAINT "fk_id_template" FOREIGN KEY ("id_template") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE\
        );'
}, {
    name: 'Data',
    schema:
        'CREATE TABLE "Data" (\
            "id"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
            "id_card"  INTEGER NOT NULL ON CONFLICT ABORT,\
            "id_field"  INTEGER NOT NULL ON CONFLICT ABORT,\
            "value"  TEXT,\
            CONSTRAINT "fk_id_card" FOREIGN KEY ("id_card") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,\
            CONSTRAINT "fk_id_field" FOREIGN KEY ("id_field") REFERENCES "Field" ("id") ON DELETE RESTRICT ON UPDATE CASCADE\
        );'
}];



dbDataExample = [
    [
        [1, "IM", "Instant messaging (IM) is a type of online chat which offers real-time text transmission over the Internet."],
        [2, "E-mail", "Electronic mail is a method of exchanging digital messages from an author to one or more recipients."]
    ],
    [
        [1, "134-217-728", "", 1],
        [2, "268-435-456", "", 1],
        [3, "john_smith", "", 1],
        [4, "john@email.net", "", 2],
        [5, "smith@company.com", "", 2],
        [6, "jane@email.net", "Wife", 2],
        [7, "pupkin@company.com", "Vasya Pupkin", 2]
    ],
    [
        [1, "Work", ""],
        [2, "ICQ", "ICQ LLC is an instant messaging computer program that was first developed and popularized by the Israeli company Mirabilis."],
        [3, "Skype", "Skype is a proprietary voice-over-IP service and software application."]
    ],
    [
        [1, 1, 2],
        [2, 2, 2],
        [3, 2, 1],
        [4, 3, 3],
        [5, 5, 1],
        [6, 7, 1]
    ],
    [
        [1, "Login", "", 1, 1, 1],
        [2, "Password", "", 2, 4, 1],
        [3, "Server", "", 1, 3, 2],
        [4, "Address", "", 2, 3, 2],
        [5, "Password", "", 3, 4, 2]
    ],
    [
        [1, 1, 1, "134-217-728"],
        [2, 1, 2, "qwerty"],
        [3, 2, 1, "268-435-456"],
        [4, 2, 2, "qwerty"],
        [5, 3, 1, "john_smith"],
        [6, 3, 2, "qwerty"],
        [7, 4, 3, "http://www.email.net/"],
        [8, 4, 4, "john@email.net"],
        [9, 4, 5, "qwerty"],
        [10, 5, 3, "http://mail.company.com/"],
        [11, 5, 4, "smith@company.com"],
        [12, 5, 5, "qwerty"],
        [13, 7, 3, "http://mail.company.com/"],
        [14, 7, 4, "pupkin@company.com"],
        [15, 7, 5, ""],
        [16, 6, 3, "http://www.email.net/"],
        [17, 6, 4, "jane@email.net"],
        [18, 6, 5, ""]
    ]
];




dbDataUpdate = [{
    version: '1.2.2',
    fnUpdate: function(db, cb) {
        db.connection.transaction(function(tr) {
            var aInsert = _.map(dbData[4].data, function(d) {
                return {query: dbData[4].query, data: d};
            });
            db.sql(tr,
                [
                    'ALTER Table Field ADD COLUMN "extra" AFTER "name";',
                    'DROP TABLE Type',
                    dbData[4].schema
                ].concat(aInsert)
            ).done(cb || $.noop);
        });
    }
}];