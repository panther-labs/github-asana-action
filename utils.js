const core = require('@actions/core');

const DEFAULT_RELATED_PHRASE_REGEX = '(R|r)elates'
const DEFAULT_CLOSES_PHRASE_REGEX = '(C|c)loses'
const defaultMarkdownComments = {
  closes: 'A Pull Request closing this task has opened [{repo}/{pr_id}]({pr_url})',
  related: 'A Pull Request related to this task has opened [{repo}/{pr_id}]({pr_url})',
  mentioned: 'A Pull Request mentioning this task has opened [{repo}/{pr_id}]({pr_url})'
}

async function moveSection(client, taskId, targets) {
  const task = await client.tasks.findById(taskId);

  for (const target of targets) {
    const projectNameRegex = new RegExp(target.projectNameRegex || target.project)
    const targetProject = task.projects.find(project => projectNameRegex.test(project.name));
    if (!targetProject) {
      core.info(`This task does not exist in "${target.project}" project`);
      continue;
    }
    const sections = await client.sections.findByProject(targetProject.gid)
    const targetSection = sections.find(section => section.name === target.section);
    if (targetSection) {
      await client.sections.addTask(targetSection.gid, { task: taskId });
      core.info(`Moved to: ${target.project}/${target.section}`);
    } else {
      core.error(`Asana section ${target.section} not found.`);
    }
  }
}

async function findComment(client, taskId, commentId) {
  let stories;
  try {
    const storiesCollection = await client.tasks.stories(taskId);
    stories = await storiesCollection.fetch(200);
  } catch (error) {
    throw error;
  }

  return stories.find(story => story.text.indexOf(commentId) !== -1);
}

async function addComment(client, taskId, commentId, text, isPinned) {
  if(commentId){
    text += '\n'+commentId+'\n';
  }
  try {
    const comment = await client.tasks.addComment(taskId, {
      text: text,
      is_pinned: isPinned,
    });
    return comment;
  } catch (error) {
    console.error('rejecting promise', error);
  }
}

function findTasksFromPrBody(body, triggerPhrase = '') {
  const REGEX_STRING = `(${triggerPhrase})(?:\\s*)https:\\/\\/app.asana.com\\/(\\d+)\\/(?<project>\\d+)\\/(?<task>\\d+)`;
  const REGEX = new RegExp(REGEX_STRING,'g')

  console.info('looking in body', body, '\nregex', REGEX_STRING);

  let foundAsanaTasks = [];
  let parseAsanaURL;
  while ((parseAsanaURL = REGEX.exec(body)) !== null) {
    const taskId = parseAsanaURL.groups.task;
    if (!taskId) {
      core.error(`Invalid Asana task URL after the trigger phrase ${triggerPhrase}`);
      continue;
    }
    foundAsanaTasks.push(taskId);
  }
  return foundAsanaTasks;
}


function formatComment(comment, pullRequestUrl, repo, prId) {
  return comment
    .replace('{pr_url}', pullRequestUrl)
    .replace('{repo}', repo)
    .replace('{pr_id}', prId)
}

function generateComments(pullRequest, issue) {
  const { body, html_url: prUrl } = pullRequest
  const { number: prNumber, repo } = issue
  const
    RELATED_PHRASE = core.getInput('related-phrase'),
    RELATED_PHRASE_REGEX = core.getInput('related-phrase-regex'),
    CLOSES_PHRASE = core.getInput('closes-trigger-phrase'),
    CLOSES_PHRASE_REGEX = core.getInput('trigger-phrase-regex'),

    CLOSES_TEXT = core.getInput('closes-text') || defaultMarkdownComments.closes,
    MENTIONED_TEXT = core.getInput('mentioned-text') || defaultMarkdownComments.mentioned,
    RELATED_TEXT = core.getInput('related-text') || defaultMarkdownComments.related

  const closesAsanaTasks = findTasksFromPrBody(body, CLOSES_PHRASE_REGEX || CLOSES_PHRASE || DEFAULT_CLOSES_PHRASE_REGEX)
  closesAsanaTasks.length && console.info(`PR will close ${closesAsanaTasks.length} tasks, taskIds:`, closesAsanaTasks.join(','));

  const relatedAsanaTasks = findTasksFromPrBody(body, RELATED_PHRASE_REGEX || RELATED_PHRASE || DEFAULT_RELATED_PHRASE_REGEX)
  relatedAsanaTasks.length && console.info(`PR relates to ${relatedAsanaTasks.length} tasks, taskIds:`, relatedAsanaTasks.join(','));

  const allAsanaTasks = findTasksFromPrBody(body, '')
  const mentionedAsanaTasks = allAsanaTasks.filter(taskId => !(closesAsanaTasks.includes(taskId) || relatedAsanaTasks.includes(taskId)))
  mentionedAsanaTasks.length && console.info(`PR mentioning ${mentionedAsanaTasks.length} tasks, taskIds:`, mentionedAsanaTasks.join(','));

  const closesMarkdownComment = formatComment(CLOSES_TEXT, prUrl, repo, prNumber);
  const relatedMarkdownComment = formatComment(RELATED_TEXT, prUrl, repo, prNumber);
  const mentionedMarkdownComment = formatComment(MENTIONED_TEXT, prUrl, repo, prNumber);
  const comments = [];
  for(const taskId of closesAsanaTasks) {
    comments.push({
      taskId,
      comment: closesMarkdownComment,
      isPinned: true,
    });
  }
  for(const taskId of relatedAsanaTasks) {
    comments.push({
      taskId,
      comment: relatedMarkdownComment,
    });
  }
  for(const taskId of mentionedAsanaTasks) {
    comments.push({
      taskId,
      comment: mentionedMarkdownComment,
    });
  }
  return comments;
}

module.exports = {
  moveSection,
  findComment,
  addComment,
  findTasksFromPrBody,
  generateComments,
}