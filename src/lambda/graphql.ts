import { ApolloServer, gql } from 'apollo-server-lambda';
import DataLoader from 'dataloader';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

function debug(subject: string, msg: string | object) {
    console.log(`DEBUG: ${subject} ${JSON.stringify(msg)}`);
}

function promiseAllOrError<K>(promises: ReadonlyArray<Promise<K>>): Promise<ReadonlyArray<K>> {
    let results: Array<K> = [];
    let completed = 0;

    return new Promise((resolve, reject) => {
        promises.forEach((promise, index) => {
            promise.then(value => {
                results[index] = value;
            }).catch(err => {
                results[index] = err;
            }).finally(() => {
                completed += 1;

                if (completed == promises.length) {
                    resolve(results);
                }
            });
        });
    });
}

const guideDataLoader = new DataLoader<number, unknown>(keys => {
    debug("guide batch", keys);
    return new Promise((resolve, reject) => {
        const results = keys.map(key =>
            axios.get('https://ifixit.com/api/2.0/guides/' + key)
        );

        promiseAllOrError(results).then(results => {
            resolve(results.map(result => result.data));
        }).catch(err => {
            debug("User Error", err.message);
        });
    });
});
const userDataLoader = new DataLoader<number, unknown>(keys => {
    debug("user batch", keys);
    return new Promise((resolve, reject) => {
        const results = keys.map(key =>
            axios.get('https://ifixit.com/api/2.0/users/' + key)
        );

        promiseAllOrError(results).then(results => {
            resolve(results.map(result => result.data));
        }).catch(err => {
            debug("User Error", err.message);
        });
    });
});

const typeDefs = gql`
    type Guide {
        guideid: Int
        title: String
        summary: String
        category: String
        image: Image
        author: Author!
        public: Boolean
        difficulty: String
        created_date: Int
        locale: String
        patrol_threshold: Int
        type: String
        url: String
        subject: String
        conclusion_raw: String
        conclusion_rendered: String
        modified_date: Int
        flags: [GuideFlag!]!
        parts: [GuideThing!]!
        tools: [GuideThing!]!
    }

    type Image {
        guid: String
        id: Int
        large: String
        medium: String
        original: String
        standard: String
        thumbnail: String
    }

    type Author {
        image: Image
        join_date: Int
        reputation: Int
        teams: [Int!]
        userid: Int
        username: String
        unique_username: String
    }

    type BadgeCount {
        bronze: Int
        silver: Int
        gold: Int
        total: Int
    }

    type GuideFlag {
        flagid: String
        text: String
        title: String
    }

    type GuideThing {
        text: String
        notes: String
        type: String
        quantity: Int
        url: String
        thumbnail: String
    }

    type User {
        userid: Int
        username: String
        unique_username: String
        image: Image
        teams: [Int]
        privileges: [String]
        reputation: Int
        join_date: Int
        location: String
        certification_count: Int
        summary: String
        about_raw: String
        about_rendered: String
    }

    type Query {
        guide(guideid: Int!): Guide
        user(userid: Int!): User
    }
`;

const resolvers = {
    Query: {
        guide: async (parent: object, { guideid } : { guideid: number }) => {
            debug("Guide resolver", { guideid })
            const guide = await guideDataLoader.load(guideid);
            debug("Guide response", guide);
            return guide;
        },
        user: async (parent: object, { userid } : { userid: number }) => {
            debug("User resolver", { userid })
            const user = await userDataLoader.load(userid);
            debug("User response", user);
            return user;
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    engine: {
        apiKey: process.env.ENGINE_API_KEY
    },
    introspection: true,
    playground: true
});

export const handler = server.createHandler();
