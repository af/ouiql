-- return: record
DELETE FROM :tableName WHERE id = :id RETURNING :readFields;
