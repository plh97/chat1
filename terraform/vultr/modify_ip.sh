#!/bin/bash

set -eu

ip="$1"
variable_name="DEPLOY_HOST"
repo_url=$(git config --file ../../.git/config --get remote.origin.url)
ssh_config_file="$HOME/.ssh/config"
ssh_identity_file="~/.ssh/qwe.pem"

sync_ssh_config() {
	mkdir -p "$HOME/.ssh"
	touch "$ssh_config_file"
	tmp_file=$(mktemp)
	awk -v ip="$ip" '
	function ensure_hostname() {
		if (in_vultr && !host_name_updated) {
			print "  HostName " ip
			host_name_updated = 1
		}
	}
	function ensure_identity() {
		if (in_vultr && !identity_updated) {
			print "  IdentityFile ~/.ssh/qwe.pem"
			identity_updated = 1
		}
	}
	function ensure_identities_only() {
		if (in_vultr && !identities_only_updated) {
			print "  IdentitiesOnly yes"
			identities_only_updated = 1
		}
	}
	$1 == "Host" {
		if (in_vultr) {
			ensure_hostname()
			ensure_identity()
			ensure_identities_only()
			in_vultr = 0
		}
		if ($2 == "vultr") {
			in_vultr = 1
			host_seen = 1
			host_name_updated = 0
			identity_updated = 0
			identities_only_updated = 0
			print
			next
		}
	}
	in_vultr && $1 == "HostName" {
		print "  HostName " ip
		host_name_updated = 1
		next
	}
	in_vultr && $1 == "IdentityFile" {
		print "  IdentityFile ~/.ssh/qwe.pem"
		identity_updated = 1
		next
	}
	in_vultr && $1 == "IdentitiesOnly" {
		print "  IdentitiesOnly yes"
		identities_only_updated = 1
		next
	}
	{
		print
	}
	END {
		if (in_vultr) {
			ensure_hostname()
			ensure_identity()
			ensure_identities_only()
		}
		if (!host_seen) {
			if (NR > 0) {
				print ""
			}
			print "Host vultr"
			print "  HostName " ip
			print "  IdentityFile ~/.ssh/qwe.pem"
			print "  IdentitiesOnly yes"
			print "  User root"
		}
	}
	' "$ssh_config_file" > "$tmp_file"
	mv "$tmp_file" "$ssh_config_file"
	chmod 600 "$ssh_config_file"
}

sync_ssh_config

case "$repo_url" in
	git@*:*/*)
		repo_path=${repo_url#*:}
		;;
	ssh://git@*/*/*)
		repo_path=${repo_url#ssh://git@*/}
		;;
	https://github.com/*/*)
		repo_path=${repo_url#https://github.com/}
		;;
	http://github.com/*/*)
		repo_path=${repo_url#http://github.com/}
		;;
	*)
		echo "Unsupported origin URL: $repo_url"
		exit 1
		;;
esac

repo_path=${repo_path%.git}
repo_owner=${repo_path%%/*}
repo_name=${repo_path#*/}

echo "$ip" > public_ip.txt
node ../../scripts/replaceIP.js ../../packages/frontend/vercel.json "$ip"

if [ -z "${GITHUB_TOKEN:-}" ]; then
	echo "GITHUB_TOKEN is not set, skipping GitHub variable sync"
	exit 0
fi

api_base="https://api.github.com/repos/${repo_owner}/${repo_name}/actions/variables"
payload=$(printf '{"name":"%s","value":"%s"}' "$variable_name" "$ip")
response_file=$(mktemp)

update_status=$(curl -sS -o "$response_file" -w "%{http_code}" \
	-X PATCH \
	-H "Accept: application/vnd.github+json" \
	-H "Authorization: Bearer ${GITHUB_TOKEN}" \
	-H "X-GitHub-Api-Version: 2022-11-28" \
	"$api_base/$variable_name" \
	-d "$payload")

if [ "$update_status" = "204" ]; then
	rm -f "$response_file"
	exit 0
fi

create_status=$(curl -sS -o "$response_file" -w "%{http_code}" \
	-X POST \
	-H "Accept: application/vnd.github+json" \
	-H "Authorization: Bearer ${GITHUB_TOKEN}" \
	-H "X-GitHub-Api-Version: 2022-11-28" \
	"$api_base" \
	-d "$payload")

if [ "$create_status" = "201" ]; then
	rm -f "$response_file"
	exit 0
fi

cat "$response_file"
rm -f "$response_file"
exit 1
