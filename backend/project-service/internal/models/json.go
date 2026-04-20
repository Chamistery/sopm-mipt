package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

func marshalJSONValue(value interface{}) (driver.Value, error) {
	return json.Marshal(value)
}

func scanJSONValue(src interface{}, dst interface{}) error {
	if src == nil {
		return nil
	}

	switch value := src.(type) {
	case []byte:
		return json.Unmarshal(value, dst)
	case string:
		return json.Unmarshal([]byte(value), dst)
	default:
		return fmt.Errorf("unsupported json scan type %T", src)
	}
}
