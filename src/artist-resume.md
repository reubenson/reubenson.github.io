---
layout: resume.njk
title: Reuben Son
includeBiography: true
includeDiscography: true
includePerformances: true
includeProjects: true
includeResidencies: true
# includeEmployment: true
includeEducation: false
includeExhibitions: true
includeTalks: true
---
# {{ title }}

{% renderFile './src/_includes/resume/artist-bio.md' %}

<style>
  .resume-year {
    padding-right: 10px;
  }

  ul {
    padding-left: 0
  }

  li {
    list-style: none;
    padding-left: 0;
    font-size: 14px;
  }

  li a {
    text-decoration: none;
  }

  p {
    font-size: 14px;
  }
  
  h1 {
    font-size: 42px;
    margin-top: 10px;
  }
</style>
