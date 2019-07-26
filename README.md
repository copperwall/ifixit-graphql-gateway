# iFixit GraphQL Gateway

A web server that lets you consume iFixit's REST API through GraphQL.

The schema currently supports a subset of Guide and User fields, but PRs are more than welcome.

Requests are batched and cached with `dataloader`.