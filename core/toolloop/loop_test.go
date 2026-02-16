package toolloop

import "testing"

func TestIsDangerousName(t *testing.T) {
	cases := []struct {
		name string
		args string
		want bool
	}{
		{"deletePet", "{}", true},
		{"removeUser", "{}", true},
		{"destroySession", "{}", true},
		{"dropTable", "{}", true},
		{"purgeCache", "{}", true},
		{"resetPassword", "{}", true},
		{"listPets", "{}", false},
		{"getPet", "{}", false},
		{"createPet", "{}", false},
	}
	for _, c := range cases {
		got := isDangerous(c.name, c.args)
		if got != c.want {
			t.Errorf("isDangerous(%q, %q) = %v, want %v", c.name, c.args, got, c.want)
		}
	}
}

func TestIsDangerousArgs(t *testing.T) {
	cases := []struct {
		name string
		args string
		want bool
	}{
		{"callAPI", `{"method": "delete"}`, true},
		{"callAPI", `{"method": "put"}`, true},
		{"callAPI", `{"method": "patch"}`, true},
		{"callAPI", `{"method": "get"}`, false},
		{"callAPI", `{"method": "post"}`, false},
	}
	for _, c := range cases {
		got := isDangerous(c.name, c.args)
		if got != c.want {
			t.Errorf("isDangerous(%q, %q) = %v, want %v", c.name, c.args, got, c.want)
		}
	}
}
