#!/bin/bash

#
# https://gist.github.com/johncmunson/ca02a8027a923a7f4b2f662c67d6528c
#
# Inspects branch name and checks if it contains a Jira ticket number (i.e. ABC-123).
# If yes, commit message will be automatically prepended with [ABC-123].
#
# Useful for looking through git history and relating a commit or group of commits
# back to a user story.
#

BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Ensure BRANCH_NAME is not empty and is not in a detached HEAD state (i.e. rebase).
# SKIP_PREPARE_COMMIT_MSG may be used as an escape hatch to disable this hook,
# while still allowing other githooks to run.
if [ ! -z "$BRANCH_NAME" ] && [ "$BRANCH_NAME" != "HEAD" ] && [ "$SKIP_PREPARE_COMMIT_MSG" != 1 ]; then

  PREFIX_PATTERN='[a-z]{1,}\/[0-9]{1,}'

  [[ $BRANCH_NAME =~ $PREFIX_PATTERN ]]

  PREFIX=${BASH_REMATCH[0]}

  PREFIX_IN_COMMIT=$(grep -c "\[$PREFIX\]" $1)

  # Ensure PREFIX exists in BRANCH_NAME and is not already present in the commit message
  if [[ -n "$PREFIX" ]] && ! [[ $PREFIX_IN_COMMIT -ge 1 ]]; then
    sed -i.bak -e "1s~^~[$PREFIX] ~" $1
  fi

fi

#
# Resources:
#   - https://gist.github.com/bartoszmajsak/1396344
#   - https://stackoverflow.com/questions/34213120/find-branch-name-during-git-rebase
#   - https://github.com/typicode/husky/issues/311#issuecomment-580237182
#   - https://gmurphey.github.io/2013/02/02/ignoring-git-hooks-when-rebasing.html#.XkK1AhNKjOQ
#   - https://mikemadisonweb.github.io/2018/12/18/git-hook-prepending-commit-message/
#   - https://stackoverflow.com/questions/5894946/how-to-add-gits-branch-name-to-the-commit-message
#   - http://blog.bartoszmajsak.com/blog/2012/11/07/lazy-developers-toolbox-number-1-prepend-git-commit-messages/
#   - https://docs.npmjs.com/files/package.json#bin
#   - https://www.deadcoderising.com/how-to-smoothly-develop-node-modules-locally-using-npm-link/
#   - https://github.com/sindresorhus/execa
#   - https://github.com/shelljs/shelljs
#

#
# Alternative method for finding the branch name
#
# Note that during a rebase, this will return something like
#   (no branch, rebasing ABC-123-feature-x)
# instead of
#   HEAD
#
# BRANCH_NAME=$(git branch | grep '*' | sed 's/* //')
#

#
# Also, don't forget to place this inside package.json if this is part of a node/npm project
#
# "husky": {
#   "hooks": {
#     "prepare-commit-msg": "./prepare-commit-msg.sh $HUSKY_GIT_PARAMS"
#   }
# }
#
