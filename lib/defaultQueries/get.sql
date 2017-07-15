-- Read a single record from the given relation, using the readFields projection
--
-- @param id
-- @returns record
SELECT :readFields FROM :relation WHERE id = :id;

