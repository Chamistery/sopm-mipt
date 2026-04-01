package models

type User struct {
	ID        int    `json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Company   string `json:"company,omitempty"`
	Course    string `json:"course,omitempty"`
	Group     string `json:"group,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
}
