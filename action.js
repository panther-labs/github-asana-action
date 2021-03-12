const core = require('@actions/core');
const github = require('@actions/github');
const asana = require('asana');
const { findComment, addComment, moveSection, findTasksFromPrBody } = require('./utils');

async function buildClient(asanaPAT) {
  return asana.Client.create({
    defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
    logAsanaChangeWarnings: false
  }).useAccessToken(asanaPAT).authorize();
}

async function action() {  
  const 
    ASANA_PAT = core.getInput('asana-pat', {required: true}),
    ACTION = core.getInput('action', {required: true}),
    TRIGGER_PHRASE = core.getInput('trigger-phrase') || '',
    TRIGGER_PHRASE_REGEX = core.getInput('trigger-phrase-regex'),
    PULL_REQUEST = github.context.payload.pull_request;

  console.log('pull_request', PULL_REQUEST);

  const client = await buildClient(ASANA_PAT);
  if(client === null){
    throw new Error('client authorization failed');
  }

  const foundAsanaTasks = findTasksFromPrBody(PULL_REQUEST.body, TRIGGER_PHRASE_REGEX || TRIGGER_PHRASE)
  console.info(`found ${foundAsanaTasks.length} taskIds:`, foundAsanaTasks.join(','));

  console.info('calling', ACTION);
  switch(ACTION){
    case 'assert-link': {
      const githubToken = core.getInput('github-token', {required: true});
      const linkRequired = core.getInput('link-required', {required: true}) === 'true';
      const octokit = new github.GitHub(githubToken);
      const statusState = (!linkRequired || foundAsanaTasks.length > 0) ? 'success' : 'error';
      core.info(`setting ${statusState} for ${github.context.payload.pull_request.head.sha}`);
      octokit.repos.createStatus({
        ...github.context.repo,
        'context': 'asana-link-presence',
        'state': statusState,
        'description': 'asana link not found',
        'sha': github.context.payload.pull_request.head.sha,
      });
      break;
    }
    case 'add-comment': {
      const commentId = core.getInput('comment-id'),
        htmlText = core.getInput('text', {required: true}),
        isPinned = core.getInput('is-pinned') === 'true';
      const comments = [];
      for(const taskId of foundAsanaTasks) {
        if(commentId){
          const comment = await findComment(client, taskId, commentId);
          if(comment){
            console.info('found existing comment', comment.gid);
            continue;
          }
        }
        const comment = await addComment(client, taskId, commentId, htmlText, isPinned);
        comments.push(comment);
      };
      return comments;
    }
    case 'remove-comment': {
      const commentId = core.getInput('comment-id', {required: true});
      const removedCommentIds = [];
      for(const taskId of foundAsanaTasks) {
        const comment = await findComment(client, taskId, commentId);
        if(comment){
          console.info("removing comment", comment.gid);
          try {
            await client.stories.delete(comment.gid);
          } catch (error) {
            console.error('rejecting promise', error);
          }
          removedCommentIds.push(comment.gid);
        }
      }
      return removedCommentIds;
    }
    case 'complete-task': {
      const isComplete = core.getInput('is-complete') === 'true';
      const taskIds = [];
      for(const taskId of foundAsanaTasks) {
        console.info("marking task", taskId, isComplete ? 'complete' : 'incomplete');
        try {
          await client.tasks.update(taskId, {
            completed: isComplete
          });
        } catch (error) {
          console.error('rejecting promise', error);
        }
        taskIds.push(taskId);
      };
      return taskIds;
    }
    case 'move-section': {
      const targetJSON = core.getInput('targets', {required: true});
      const targets = JSON.parse(targetJSON);
      const movedTasks = [];
      for(const taskId of foundAsanaTasks) {
        await moveSection(client, taskId, targets);
        movedTasks.push(taskId);
      }
      return movedTasks;
    }
    default:
      core.setFailed("unexpected action ${ACTION}");
  }
}

module.exports = {
  action,
  default: action,
  buildClient: buildClient
};