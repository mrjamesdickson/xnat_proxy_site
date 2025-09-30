# XNAT User Administration API Reference

Collected while inspecting the legacy Manage Users page (`/app/template/Page.vm?view=admin/users`) on `demo02.xnatworks.io` using the `admin` / `admin` demo credentials.

## Authentication

Create a session once and reuse its cookies for the calls below:

```bash
curl -c cookies.txt \
     -d "username=admin&password=admin" \
     http://demo02.xnatworks.io/data/JSESSION
```

All subsequent requests add `-b cookies.txt`. (For quick checks you can also use `curl -u admin:admin …`).

## Read Endpoints

| Purpose | Method & Path | Notes |
| --- | --- | --- |
| Initial table | `GET /xapi/users/current?format=json` | “Current users” filtered list. |
| Load all users | `GET /xapi/users/profiles?format=json` | Returns every user profile. |
| Single profile | `GET /xapi/users/profile/{username}` | Used to populate the edit dialog. |
| Role map | `GET /xapi/users/rolemap` | Maps each role to its user list. |
| Active sessions summary | `GET /xapi/users/active` | Used for the “Active” column icon. |
| Active sessions detail | `GET /xapi/users/active/{username}` | Returned when the UI refreshes a specific row. |
| Roles for a user | `GET /xapi/users/{username}/roles` | Supplies the role pickers. |
| Authentication detail | `GET /xapi/users/authDetails/{username}` | Populates the “View Authentication Details” dialog. |

Example:

```bash
curl -b cookies.txt \
     http://demo02.xnatworks.io/xapi/users/profiles?format=json
```

## Mutation Endpoints

| Action | Method & Path | Payload |
| --- | --- | --- |
| Create user | `POST /xapi/users` | JSON body with `username`, `password`, `email`, `firstName`, `lastName`, `enabled`, `verified`, optional `roles` and `groups`. |
| Update user | `PUT /xapi/users/{username}` | Same fields (password optional). |
| Toggle verified | `PUT /xapi/users/{username}/verified/{true|false}` | No body. |
| Toggle enabled | `PUT /xapi/users/{username}/enabled/{true|false}` | No body. |
| Kill sessions | `DELETE /xapi/users/active/{username}` | Removes all active sessions. |
| Change password | `PUT /xapi/users/{username}` | Body containing new password fields. |

Example update:

```bash
curl -b cookies.txt \
     -H "Content-Type: application/json" \
     -X PUT \
     -d '{"email":"new@example.com","enabled":true,"verified":true,"roles":["ADMINISTRATOR"],"groups":["XNAT_ADMIN"]}' \
     http://demo02.xnatworks.io/xapi/users/admin
```

## Notes

- Responses returned by these `/xapi/users/**` endpoints contain mixed-case property names (`firstName`, `lastSuccessfulLogin`, etc.). Callers should normalize values (strip whitespace, coerce booleans, join role arrays, etc.).
- The legacy UI starts with `/xapi/users/current` and switches to `/xapi/users/profiles` when “Load All Users” is clicked. Both share the same structure; the first is faster for initial load.
- When inspecting per-user dialogs the page fetches `/xapi/users/profile/{username}` and `/xapi/users/{username}/roles`, then posts back via the same base path (`/xapi/users/{username}`) on save.
- Active session management and authentication detail dialogs rely on `/xapi/users/active/{username}` and `/xapi/users/authDetails/{username}` respectively.
