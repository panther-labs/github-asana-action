const core = require('@actions/core');

async function moveSection(client, taskId, targets) {
  const task = await client.tasks.findById(taskId);

  for (const target of targets) {
    // Find the right project
    const projectNameRegex = new RegExp(target.projectNameRegex || target.project)
    const targetProject = task.projects.find(project => projectNameRegex.test(project.name));
    if (!targetProject) {
      core.info(`This task does not exist in "${target.project}" project`);
      continue;
    }
    core.info(`Discovered Project: ${targetProject.name} with ID: ${targetProject.gid}`);
    
    // Find the right section
    const sectionNameRegex = new RegExp(target.section)
    const sections = await client.sections.findByProject(targetProject.gid)
    const targetSection = sections.find(section => sectionNameRegex.test(section.name));
    if (!targetSection) {
      core.info(`Could not find a section matching "${target.section}"`);
      continue;
    }
    core.info(`Discovered Section: ${targetSection.name} with ID: ${targetSection.gid}`);
    
    // Move the task
    await client.sections.addTask(targetSection.gid, { task: taskId });
    core.info(`Moved to: ${targetProject.name}/${targetSection.name}`);
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
  const REGEX_STRING = `(${triggerPhrase})(:?\\s*)https:\\/\\/app.asana.com\\/(\\d+)\\/(?<project>\\d+)\\/(?<task>\\d+)`;
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

module.exports = {
  moveSection,
  findComment,
  addComment,
  findTasksFromPrBody,
}
