-- Delete a single record from the given relation, returning the deleted record
--
-- @param id
-- @returns record
DELETE FROM :relation WHERE id = :id RETURNING :readFields;

