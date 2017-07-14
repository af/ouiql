-- return: record
DELETE FROM :relation WHERE id = :id RETURNING :readFields;

