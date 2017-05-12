## Apollo GraphQL Logger

## Installation

```bash
npm install --save-dev apollo-logger
```

## Usage

For full logging you will need to attach Apollo Logger to:
- Network interface
- Subscription manager 
- And PubSub

``` js
import { addApolloLogging } from 'apollo-logger';

let networkInterface = addApolloLogging(createBatchingNetworkInterface({
  ...
}));

const pubsub = addApolloLogging(new PubSub());

const subscriptionManager = addApolloLogging(new SubscriptionManager(...));
```

## Sample output

On each example the result of operation comes after `=>`

- Query:
``` js
getPost({"id":"3"}) => {"data":{"post":{"id":"3","title":"Post title 3", "__typename":"Post"}}}
```

- Mutation:
``` js
addCount({"amount":1}) => {"data":{"addCount":{"amount":17,"__typename":"Count"}}}
```

- Subscription
``` js
onCountUpdated({}) => subscription: 2
```

- Subscription message:
``` js
{"commentUpdated":{"mutation":"CREATED","id":"3003", ... ,"__typename":"UpdateCommentPayload"}}
```

- Unsubscription
``` js
unsubscribe from subscription: 2
```

- PubSub publish on a server:
``` js
pubsub publish [ 'countUpdated',
  { id: 1, created_at: null, updated_at: null, amount: 7 } ]
```

- PubSub subscribe on a server:
``` js
pubsub subscribe postsUpdated => 2
```

- PubSub unsubscribe on a server:
``` js
pubsub unsubscribe [ 2 ]
```

- PubSub message generated on a server:
``` js
pubsub msg postsUpdated({"mutation":"CREATED","id":21,"node":{"id":21,"title":"New post 1"}})
```

- PubSub filter check on a server:
``` js
pubsub filter postsUpdated(opts = {"query":...,"context":{}}, args = {"endCursor":10}, name = postsUpdated)
.postsUpdated(val = {"mutation":"CREATED","id":21,"node":{"id":21,"title":"New post 1"}}, ctx = {}) => true
```

## License
Copyright © 2017 [SysGears INC]. This source code is licensed under the [MIT] license.

[MIT]: LICENSE
[SysGears INC]: http://sysgears.com
