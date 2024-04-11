<script lang="ts">
  import HeaderBar from "./components/HeaderBar.svelte";
  import BodyContainer from "./components/BodyContainer.svelte";
  import SidebarGeneList from "./components/SidebarGeneList.svelte";
</script>

<style>
  :global(.headerbar) {
    grid-area: header;
  }
  :global(.menuLeft) {
    /*background-color: brown;*/
    grid-area: sidebar;
    min-height: 10vh;
    max-height: 30vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }
  :global(.maincontent) {
    grid-area: maincontent;
    min-height: 400px;
    max-height: 80vh;
    overflow: scroll;
  }
  #gridWrapper {
    display: grid;
    grid-gap: 10px;
    grid-template-columns: minmax(400px, 20%) 1fr 1fr;
    grid-template-areas:
      "header  header  header"
      "sidebar maincontent maincontent"
      "footer  footer  footer";
    background-color: #fff;
    color: #444;
  }
</style>

<div id="gridWrapper">
  <HeaderBar class="headerbar" />
  <!-- <SidebarMenu class="menuLeft" /> -->
  <div class="menuLeft">
    <h5 class="mt-2 ml-2">Search results:</h5>
    <SidebarGeneList />
  </div>
  <BodyContainer class="maincontent" />
</div>
