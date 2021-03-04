## Description

This guide will help you test local code for Github Asana Actions.

### Step 1: Install Act tool

Initially, you will need to install [nektos/act](https://github.com/nektos/act) tool. Follow detailed instructions there.

To validate, everything is in place run on project root directory: 

```
act pull_request -l
```

You should see two actions for PR open and close, taken from `asana_demo.yml`.

### Step 2: Add Asana PAT 

In order to make actual requests to Asana, you need to request for an Asana PAT (personal access token).

After, generating the token, create a new file `.secrets` and add it there.

### Step 3: Change demo events

In this folder there are 2 demo Github JSON events that you can feed to your actions on run.

Go ahead and replace the asana task URl to a real one task URL.

### Step 4: Run an Action

You 'll see there are 2 bash scripts on this folder, each has 2 commands, lets check their context.

About `open.sh`:
#### i. Docker copy
Originally, you shouldn't need this command but there are some issues on act [(1)](https://github.com/nektos/act/pull/525) and [(2)](https://github.com/nektos/act/issues/228), that requires this workaround. 
```
docker cp . <ACT_CONTAINER_NAME>:/github/workspace/github-asana-action/
```

This commands copies your latest change to the Docker container, that runs the actions.

`ACT_CONTAINER_NAME` has the format of `act-{your-yml-file-name}-{your-job-name}`

In this example the `ACT_CONTAINER_NAME` is `act-asana-demo-yml-update-task-on-pr-open`

#### ii. Running act
```
act -j <JOB_NAME> -e <EVENT_FILE_PATH -r --secret-file <SECRETS_FILE_PATH> -r
```

Breakdown: 
```
-j                  Tell act to run a specific job
-e                  Tells act to feed a specific events
--secrets-file      Tells act to read a file for secrets
-r                  Tells act to re-use container and doesn't override the files you copied on previous step
```

In our example this commands is: 
```
act -j update_task_on_pr_open -e demo/pr_open.json -r --secret-file .secrets
```

## Conclusion: 

If you completed all steps above and run `sh demo/open.sh`, you will see a new comment in the task you added on Step 2!